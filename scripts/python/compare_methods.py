"""Bước 5: so sánh hai cách tìm lịch mùa vụ (luật ngưỡng và k-means).

Trả lời 3 câu hỏi bằng số:
  1. Hai cách có đếm ra CÙNG SỐ VỤ cho mỗi năm của mỗi huyện không?
  2. Đỉnh của hai cách có rơi vào CÙNG THỜI ĐIỂM trong năm không?
  3. Kết quả luật ngưỡng có NHẠY với tham số mình tự chọn không?

Chạy từ thư mục gốc dự án (cần chạy calendar_rule.py và calendar_kmeans.py trước):
    python scripts/python/compare_methods.py
Ghi:  site/data/precomputed/method_comparison.json
      scripts/python/output/method_comparison.png
"""

import json
import statistics
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.signal import find_peaks, savgol_filter

from calendar_rule import PEAK_MIN_GAP, PEAK_MIN_NDVI, SMOOTH_ORDER, fill_gaps

HERE = Path(__file__).resolve().parent
PRE = HERE.parents[1] / "site" / "data" / "precomputed"
OUT_JSON = PRE / "method_comparison.json"
OUT_PNG = HERE / "output" / "method_comparison.png"

# ---------------------------------------------------------------------------
# Phần 1: tham số so sánh
# ---------------------------------------------------------------------------

# Giả định lấy từ FIELD_SHIFT_PIVOT.md ("three rice crops per year").
# Chưa có nguồn chính thức: cần trích dẫn trước khi đưa lên trang web.
EXPECTED_CYCLES = 3
CLOSE_DAYS = 32  # hai đỉnh lệch nhau không quá 2 ảnh (32 ngày) thì coi là cùng thời điểm
WINDOWS = (3, 5, 7)  # thử các cửa sổ làm mượt khác nhau
PROMINENCES = (0.10, 0.15, 0.20)  # thử các độ nhô đỉnh khác nhau

LINE, INK, MUTED, GRID = "#1f6b3c", "#10231a", "#5a6b61", "#e2e8e1"
MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]


def load(name):
    return json.loads((PRE / name).read_text(encoding="utf-8"))


def day_of_year(iso):
    return date.fromisoformat(iso).timetuple().tm_yday


def day_gap(a, b):
    """Khoảng cách giữa hai ngày trong năm, tính vòng tròn: 28/12 và 3/1 chỉ cách 6 ngày."""
    d = abs(a - b) % 365
    return min(d, 365 - d)


# ---------------------------------------------------------------------------
# Phần 2: ghép kết quả của hai cách theo từng (huyện, năm)
# ---------------------------------------------------------------------------

def pair_up(rule, kmeans):
    cluster_of = {(m["id"], m["year"]): c for c in kmeans["clusters"] for m in c["members"]}
    rows = []
    for d in rule["districts"]:
        for year, count in d["cyclesPerYear"].items():
            c = cluster_of[(d["id"], int(year))]
            rows.append({
                "id": d["id"],
                "name": d["name"],
                "year": int(year),
                "ruleCycles": count,
                "cluster": c["cluster"],
                "kmeansCycles": c["shape"]["peaks"],
                "rulePeakDays": [day_of_year(p) for p in d["peakDates"] if p.startswith(year)],
                "kmeansPeakDays": c["shape"]["peakDayOfYear"],
            })
    return rows


# ---------------------------------------------------------------------------
# Phần 3: câu hỏi 1 và 2 - cùng số vụ? cùng thời điểm?
# ---------------------------------------------------------------------------

def share(flags):
    return round(sum(flags) / len(flags), 2) if flags else None


def timing_gaps(row):
    """Với mỗi đỉnh của k-means, tìm đỉnh gần nhất của luật ngưỡng trong cùng năm."""
    if not row["rulePeakDays"]:
        return []
    return [min(day_gap(k, r) for r in row["rulePeakDays"]) for k in row["kmeansPeakDays"]]


def summarise(rows):
    gaps = [g for row in rows for g in timing_gaps(row)]
    return {
        "districtYears": len(rows),
        "sameCycleCount": share([r["ruleCycles"] == r["kmeansCycles"] for r in rows]),
        "ruleMatchesExpected": share([r["ruleCycles"] == EXPECTED_CYCLES for r in rows]),
        "kmeansMatchesExpected": share([r["kmeansCycles"] == EXPECTED_CYCLES for r in rows]),
        "peakPairs": len(gaps),
        "medianPeakGapDays": statistics.median(gaps) if gaps else None,
        "peaksWithinCloseDays": share([g <= CLOSE_DAYS for g in gaps]),
    }


# ---------------------------------------------------------------------------
# Phần 4: câu hỏi 3 - độ nhạy của luật ngưỡng với tham số
# ---------------------------------------------------------------------------

def sensitivity(raw):
    out = {}
    for d in raw["districts"]:
        values = fill_gaps([r["ndvi"] for r in d["series"]])
        n_years = len({r["date"][:4] for r in d["series"]})
        grid = {}
        for window in WINDOWS:
            s = savgol_filter(values, window, SMOOTH_ORDER)
            for prom in PROMINENCES:
                peaks, _ = find_peaks(s, height=PEAK_MIN_NDVI, prominence=prom, distance=PEAK_MIN_GAP)
                grid[f"w{window}_p{prom:.2f}"] = round(len(peaks) / n_years, 2)
        out[d["id"]] = {"name": d["name"], "meanCyclesPerYear": grid,
                        "min": min(grid.values()), "max": max(grid.values())}
    return out


# ---------------------------------------------------------------------------
# Phần 5: vẽ thời điểm đỉnh của hai cách trên cùng một trục tháng
# ---------------------------------------------------------------------------

def draw(rows):
    fig, ax = plt.subplots(figsize=(10, 9), layout="constrained")
    labels = []
    for i, row in enumerate(rows):
        y = len(rows) - 1 - i  # huyện đầu tiên ở trên cùng
        labels.append((y, f"{row['name'].split(' · ')[1]} {row['year']}"))
        ax.scatter(row["rulePeakDays"], [y] * len(row["rulePeakDays"]), s=90, facecolors="none",
                   edgecolors=LINE, linewidths=2, label="Luật ngưỡng" if i == 0 else None, zorder=3)
        ax.scatter(row["kmeansPeakDays"], [y] * len(row["kmeansPeakDays"]), s=30, color=INK,
                   marker="D", label="K-means (trung tâm nhóm)" if i == 0 else None, zorder=4)
        if i % 5 == 0 and i > 0:
            ax.axhline(y + 0.5, color=GRID, linewidth=1)  # vạch phân cách giữa các huyện
    ax.set_yticks([y for y, _ in labels], [t for _, t in labels], fontsize=9)
    ax.set_xticks(MONTH_STARTS, [f"T{m}" for m in range(1, 13)])
    ax.set_xlim(0, 366)
    ax.grid(axis="x", color=GRID)
    ax.tick_params(colors=MUTED)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.legend(loc="upper left", bbox_to_anchor=(0, 1.06), ncol=2, frameon=False)
    fig.suptitle("Thời điểm đỉnh NDVI (mỗi đỉnh = 1 vụ) theo hai phương pháp",
                 x=0.01, ha="left", fontsize=12, fontweight="bold", color=INK)
    return fig


# ---------------------------------------------------------------------------
# Phần 6: chạy
# ---------------------------------------------------------------------------

def main():
    rule, kmeans, raw = load("calendar_rule.json"), load("calendar_kmeans.json"), load("ndvi_raw.json")
    rows = pair_up(rule, kmeans)

    overall = summarise(rows)
    per_district = {}
    for d in rule["districts"]:
        per_district[d["id"]] = {"name": d["name"], **summarise([r for r in rows if r["id"] == d["id"]])}
    sens = sensitivity(raw)

    print("Tổng thể:", overall)
    print(f"\n{'Huyện':26} cùng số vụ | luật=3 | kmeans=3 | lệch đỉnh (trung vị) | đỉnh lệch ≤{CLOSE_DAYS} ngày | luật ngưỡng khi đổi tham số")
    for key, s in per_district.items():
        print(f"{s['name']:26} {s['sameCycleCount']:>9} | {s['ruleMatchesExpected']:>6} | {s['kmeansMatchesExpected']:>8} | "
              f"{str(s['medianPeakGapDays']) + ' ngày':>20} | {str(s['peaksWithinCloseDays']):>14} | "
              f"{sens[key]['min']}–{sens[key]['max']} vụ/năm")

    output = {
        "expectedCycles": {"value": EXPECTED_CYCLES, "note": "assumption from project brief; official source still needed"},
        "closeDays": CLOSE_DAYS,
        "overall": overall,
        "perDistrict": per_district,
        "sensitivity": {"windows": list(WINDOWS), "prominences": list(PROMINENCES), "districts": sens},
        "rows": rows,
    }
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    draw(rows).savefig(OUT_PNG, dpi=150, bbox_inches="tight")
    print(f"\nĐã lưu {OUT_JSON}\nĐã lưu {OUT_PNG}")


if __name__ == "__main__":
    main()
