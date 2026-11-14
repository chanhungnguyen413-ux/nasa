"""Bước 2: vẽ chuỗi NDVI 5 năm của 5 huyện để kiểm tra bằng mắt.

Chạy từ thư mục gốc dự án:
    python scripts/python/plot_ndvi.py
Đọc:  site/data/precomputed/ndvi_raw.json   (do fetch_ndvi.py tạo ra)
Ghi:  scripts/python/output/ndvi_5_districts.png
"""

import json
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # vẽ thẳng ra file ảnh, không cần mở cửa sổ
import matplotlib.dates as mdates
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# Phần 1: đường dẫn và màu (màu lấy từ DESIGN.md)
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
IN_FILE = ROOT / "site" / "data" / "precomputed" / "ndvi_raw.json"
OUT_FILE = HERE / "output" / "ndvi_5_districts.png"

LINE = "#1f6b3c"  # moss-700: màu đường NDVI
INK = "#10231a"  # chữ chính
MUTED = "#5a6b61"  # chữ phụ, nhãn trục
GRID = "#e2e8e1"  # lưới mờ, vạch đầu năm


# ---------------------------------------------------------------------------
# Phần 2: đọc JSON thành các danh sách ngày và giá trị
# ---------------------------------------------------------------------------

def load(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    series = []
    for district in data["districts"]:
        dates = [date.fromisoformat(r["date"]) for r in district["series"]]
        # None (thiếu dữ liệu) -> NaN, để matplotlib để trống chỗ đó thay vì nối liền
        values = [float("nan") if r["ndvi"] is None else r["ndvi"] for r in district["series"]]
        series.append((district["name"], dates, values))
    return data, series


# ---------------------------------------------------------------------------
# Phần 3: vẽ mỗi huyện một ô, chung trục để so sánh được với nhau
# ---------------------------------------------------------------------------

def draw(data, series):
    first_year, last_year = data["years"]
    fig, axes = plt.subplots(
        len(series), 1, figsize=(12, 2.3 * len(series)), sharex=True, sharey=True, layout="constrained"
    )
    for ax, (name, dates, values) in zip(axes, series):
        for year in range(first_year, last_year + 2):
            ax.axvline(date(year, 1, 1), color=GRID, linewidth=1, zorder=0)  # vạch đầu năm
        ax.plot(dates, values, color=LINE, linewidth=2)
        ax.set_title(name, loc="left", fontsize=11, fontweight="bold", color=INK)
        ax.set_ylim(-0.1, 1.0)
        ax.set_ylabel("NDVI", color=MUTED)
        ax.grid(axis="y", color=GRID, linewidth=1)
        ax.tick_params(colors=MUTED)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
        for side in ("left", "bottom"):
            ax.spines[side].set_color(GRID)

    axes[-1].xaxis.set_major_locator(mdates.YearLocator())
    axes[-1].xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.suptitle(
        f"NDVI MODIS MOD13Q1 (250 m, 16 ngày), trung vị khối ~2×2 km, {first_year}–{last_year}",
        x=0.01, ha="left", fontsize=13, fontweight="bold", color=INK,
    )
    fig.text(
        0.01, -0.01, f"Nguồn: {data['source']}. Tải lúc {data['fetchedAt']}.",
        ha="left", va="top", fontsize=8, color=MUTED,
    )
    return fig


# ---------------------------------------------------------------------------
# Phần 4: chạy
# ---------------------------------------------------------------------------

def main():
    data, series = load(IN_FILE)
    fig = draw(data, series)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_FILE, dpi=150, bbox_inches="tight")
    print(f"Đã lưu {OUT_FILE}")


if __name__ == "__main__":
    main()
