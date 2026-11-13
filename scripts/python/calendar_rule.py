"""Bước 3: tìm lịch mùa vụ bằng LUẬT NGƯỠNG (rule-based).

Ý tưởng: mỗi vụ lúa tạo một "ngọn đồi" NDVI. Làm mượt đường NDVI, đếm số đỉnh
mỗi năm (= số vụ), và đánh dấu các đoạn NDVI thấp (= đất trống hoặc ngập).

Chạy từ thư mục gốc dự án:
    python scripts/python/calendar_rule.py
Đọc:  site/data/precomputed/ndvi_raw.json
Ghi:  site/data/precomputed/calendar_rule.json
      scripts/python/output/calendar_rule.png
"""

import json
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.signal import find_peaks, savgol_filter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
IN_FILE = ROOT / "site" / "data" / "precomputed" / "ndvi_raw.json"
OUT_JSON = ROOT / "site" / "data" / "precomputed" / "calendar_rule.json"
OUT_PNG = HERE / "output" / "calendar_rule.png"

# ---------------------------------------------------------------------------
# Phần 1: tham số. Đây là LỰA CHỌN của nhóm, không phải hằng số khoa học.
# Đổi một số ở đây rồi chạy lại để xem kết quả nhạy với nó đến đâu.
# ---------------------------------------------------------------------------

SMOOTH_WINDOW = 5  # cửa sổ làm mượt: 5 ảnh x 16 ngày = 80 ngày
SMOOTH_ORDER = 2  # làm mượt bằng đường cong bậc 2 (parabol) trong mỗi cửa sổ
PEAK_MIN_NDVI = 0.5  # đỉnh phải đủ xanh mới tính là một vụ
PEAK_PROMINENCE = 0.15  # đỉnh phải nhô cao hơn đáy hai bên ít nhất 0.15
PEAK_MIN_GAP = 4  # hai đỉnh cách nhau ít nhất 4 ảnh (64 ngày)
BARE_NDVI = 0.3  # dưới mức này coi là đất trống hoặc ngập nước

# Màu lấy từ DESIGN.md
LINE, INK, MUTED, GRID, BARE_FILL = "#1f6b3c", "#10231a", "#5a6b61", "#e2e8e1", "#dccb8c"


# ---------------------------------------------------------------------------
# Phần 2: làm sạch và làm mượt
# ---------------------------------------------------------------------------

def fill_gaps(values):
    """None -> nội suy tuyến tính từ hai điểm bên cạnh (savgol không chịu được NaN)."""
    v = np.array(values, dtype=float)  # None tự thành NaN
    bad = np.isnan(v)
    if bad.any():
        idx = np.arange(len(v))
        v[bad] = np.interp(idx[bad], idx[~bad], v[~bad])
    return v


def smooth(v):
    return savgol_filter(v, SMOOTH_WINDOW, SMOOTH_ORDER)


# ---------------------------------------------------------------------------
# Phần 3: các luật - tìm đỉnh, tìm đoạn đất trống, gom theo năm và theo tháng
# ---------------------------------------------------------------------------

def crop_peaks(s):
    peaks, _ = find_peaks(s, height=PEAK_MIN_NDVI, prominence=PEAK_PROMINENCE, distance=PEAK_MIN_GAP)
    return peaks


def bare_windows(dates, s):
    """Gom các ảnh liên tiếp có NDVI < BARE_NDVI thành từng đoạn [bắt đầu, kết thúc]."""
    windows, start = [], None
    for i, value in enumerate(s):
        if value < BARE_NDVI and start is None:
            start = i
        elif value >= BARE_NDVI and start is not None:
            windows.append((start, i - 1))
            start = None
    if start is not None:
        windows.append((start, len(s) - 1))
    return [{"start": dates[a].isoformat(), "end": dates[b].isoformat(), "images": b - a + 1} for a, b in windows]


def cycles_per_year(dates, peaks, first_year, last_year):
    counts = {year: 0 for year in range(first_year, last_year + 1)}
    for p in peaks:
        counts[dates[p].year] += 1
    return counts


def monthly_profile(dates, s, peaks):
    peak_months = [dates[p].month for p in peaks]
    out = []
    for month in range(1, 13):
        values = [s[i] for i, d in enumerate(dates) if d.month == month]
        out.append({
            "month": month,
            "ndviMedian": round(float(np.median(values)), 3),
            "bareShare": round(sum(v < BARE_NDVI for v in values) / len(values), 2),  # tỉ lệ ảnh "trống"
            "peaks": peak_months.count(month),  # số đỉnh rơi vào tháng này (cộng cả 5 năm)
            "images": len(values),
        })
    return out


def analyse(district, first_year, last_year):
    dates = [date.fromisoformat(r["date"]) for r in district["series"]]
    raw = fill_gaps([r["ndvi"] for r in district["series"]])
    s = smooth(raw)
    peaks = crop_peaks(s)
    counts = cycles_per_year(dates, peaks, first_year, last_year)
    summary = {
        "id": district["id"],
        "name": district["name"],
        "cyclesPerYear": {str(y): c for y, c in counts.items()},
        "meanCyclesPerYear": round(sum(counts.values()) / len(counts), 2),
        "yearsWithThreeCycles": sum(c == 3 for c in counts.values()),
        "peakDates": [dates[p].isoformat() for p in peaks],
        "bareWindows": bare_windows(dates, s),
        "monthly": monthly_profile(dates, s, peaks),
    }
    return summary, (dates, raw, s, peaks)


# ---------------------------------------------------------------------------
# Phần 4: vẽ để kiểm tra: NDVI gốc, NDVI đã làm mượt, đỉnh, vùng đất trống
# ---------------------------------------------------------------------------

def draw(results, first_year, last_year):
    fig, axes = plt.subplots(len(results), 1, figsize=(12, 2.4 * len(results)), sharex=True, sharey=True, layout="constrained")
    for ax, (summary, (dates, raw, s, peaks)) in zip(axes, results):
        for i, value in enumerate(s):  # tô nền các ảnh "trống"
            if value < BARE_NDVI:
                ax.axvspan(dates[max(i - 1, 0)], dates[i], color=BARE_FILL, alpha=0.45, linewidth=0, zorder=0)
        ax.axhline(BARE_NDVI, color=MUTED, linewidth=1, linestyle="--", label=f"Ngưỡng đất trống ({BARE_NDVI})")
        ax.plot(dates, raw, color=MUTED, linewidth=1, alpha=0.6, label="NDVI gốc")
        ax.plot(dates, s, color=LINE, linewidth=2, label="NDVI đã làm mượt")
        ax.plot([dates[p] for p in peaks], s[peaks], "o", color=INK, markersize=6, label="Đỉnh = 1 vụ")
        ax.set_title(f"{summary['name']}: trung bình {summary['meanCyclesPerYear']} vụ/năm", loc="left", fontsize=11, fontweight="bold", color=INK)
        ax.set_ylim(-0.1, 1.0)
        ax.grid(axis="y", color=GRID)
        ax.tick_params(colors=MUTED)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
    axes[0].legend(loc="upper left", bbox_to_anchor=(0, 1.45), ncol=4, frameon=False, fontsize=9)
    fig.suptitle(f"Lịch mùa vụ theo luật ngưỡng, {first_year}–{last_year}", x=0.01, ha="left", fontsize=13, fontweight="bold", color=INK)
    return fig


# ---------------------------------------------------------------------------
# Phần 5: chạy
# ---------------------------------------------------------------------------

def main():
    data = json.loads(IN_FILE.read_text(encoding="utf-8"))
    first_year, last_year = data["years"]
    results = [analyse(d, first_year, last_year) for d in data["districts"]]

    print(f"{'Huyện':28} {'Số vụ mỗi năm':22} TB   Năm đúng 3 vụ")
    for summary, _ in results:
        per_year = " ".join(str(c) for c in summary["cyclesPerYear"].values())
        print(f"{summary['name']:28} {per_year:22} {summary['meanCyclesPerYear']:<4} {summary['yearsWithThreeCycles']}/{len(summary['cyclesPerYear'])}")

    output = {
        "method": "rule-based: Savitzky-Golay smoothing, peak detection, NDVI threshold for bare/flooded",
        "params": {
            "smoothWindowImages": SMOOTH_WINDOW,
            "smoothPolyOrder": SMOOTH_ORDER,
            "peakMinNdvi": PEAK_MIN_NDVI,
            "peakProminence": PEAK_PROMINENCE,
            "peakMinGapImages": PEAK_MIN_GAP,
            "bareNdvi": BARE_NDVI,
        },
        "source": data["source"],
        "years": data["years"],
        "districts": [summary for summary, _ in results],
    }
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    draw(results, first_year, last_year).savefig(OUT_PNG, dpi=150, bbox_inches="tight")
    print(f"Đã lưu {OUT_JSON}\nĐã lưu {OUT_PNG}")


if __name__ == "__main__":
    main()
