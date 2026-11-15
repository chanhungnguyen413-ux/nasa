"""Bước 6: khí hậu theo tháng từ NASA POWER cho 5 huyện, lưu JSON.

Lấy dữ liệu NGÀY trong nhiều năm, rồi gom thành 12 tháng:
  - lượng mưa cả tháng (mm),
  - số ngày nóng (nhiệt độ cao nhất >= 35 °C),
  - độ ẩm vùng rễ trung bình (0 = khô hẳn, 1 = bão hoà),
kèm khoảng dao động giữa các năm (bách phân vị 10 và 90).

Chạy từ thư mục gốc dự án:
    python scripts/python/fetch_power_climate.py
Ghi:  site/data/precomputed/climate_monthly.json
      scripts/python/output/climate_monthly.png
"""

import json
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# Dùng lại danh sách huyện và hàm gọi API của bước 1
from fetch_ndvi import DISTRICTS, chunks, get_json

HERE = Path(__file__).resolve().parent
OUT_JSON = HERE.parents[1] / "site" / "data" / "precomputed" / "climate_monthly.json"
OUT_PNG = HERE / "output" / "climate_monthly.png"

# ---------------------------------------------------------------------------
# Phần 1: cấu hình (tên tham số đã kiểm tra trên danh sách tham số của POWER)
# ---------------------------------------------------------------------------

API = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = {
    "PRECTOTCORR": "Precipitation Corrected, mm/day",
    "T2M_MAX": "Temperature at 2 Meters Maximum, C",
    "GWETROOT": "Root Zone Soil Wetness, 0-1 (upper ~1 m of soil)",
}
FIRST_YEAR, LAST_YEAR = 2001, 2025  # 25 năm trọn vẹn
YEARS_PER_REQUEST = 5  # tài liệu không ghi giới hạn; chia nhỏ cho an toàn
FILL = -999.0  # giá trị "không có dữ liệu" (header.fill_value)
HOT_C = 35.0  # ngưỡng ngày nóng, theo FIELD_SHIFT_PIVOT.md
MIN_VALID_SHARE = 0.9  # tháng nào thiếu hơn 10% số ngày thì bỏ tháng đó

WATER, HEAT, INK, MUTED, GRID = "#2e86c1", "#e07b2a", "#10231a", "#5a6b61", "#e2e8e1"


# ---------------------------------------------------------------------------
# Phần 2: tải dữ liệu ngày, mỗi lần 5 năm
# ---------------------------------------------------------------------------

def fetch_daily(district):
    days = {}
    for block in chunks(list(range(FIRST_YEAR, LAST_YEAR + 1)), YEARS_PER_REQUEST):
        params = {
            "parameters": ",".join(PARAMS),
            "community": "AG",
            "latitude": district["lat"],
            "longitude": district["lon"],
            "start": f"{block[0]}0101",
            "end": f"{block[-1]}1231",
            "time-standard": "LST",
            "format": "JSON",
        }
        p = get_json(API, params)["properties"]["parameter"]
        for day in p["PRECTOTCORR"]:  # khoá dạng "20250131"
            days[day] = {name: p[name][day] for name in PARAMS}
        print(f"   xong {block[0]}–{block[-1]}")
        time.sleep(1)
    return days


# ---------------------------------------------------------------------------
# Phần 3: gom ngày -> (năm, tháng) -> 12 tháng
# ---------------------------------------------------------------------------

def group_by_year_month(days):
    groups = defaultdict(lambda: {name: [] for name in PARAMS})
    for day, values in days.items():
        key = (int(day[:4]), int(day[4:6]))
        for name, v in values.items():
            groups[key][name].append(v)
    return groups


def valid(values):
    good = [v for v in values if v != FILL]
    return good if len(good) >= MIN_VALID_SHARE * len(values) else None


def spread(per_year):
    """Trung bình, trung vị và khoảng 10–90%: 8 trên 10 năm nằm trong khoảng [p10, p90].

    Với số liệu lệch (đa số năm = 0, vài năm rất cao) trung bình có thể nằm NGOÀI
    khoảng [p10, p90], nên lưu cả trung vị.
    """
    a = np.array(per_year)
    return {"mean": round(float(a.mean()), 2), "median": round(float(np.median(a)), 2),
            "p10": round(float(np.percentile(a, 10)), 2), "p90": round(float(np.percentile(a, 90)), 2),
            "years": len(a)}


def monthly_climate(days):
    groups = group_by_year_month(days)
    months = []
    for month in range(1, 13):
        rain, hot, root = [], [], []
        for (year, m), g in sorted(groups.items()):
            if m != month:
                continue
            r, t, w = valid(g["PRECTOTCORR"]), valid(g["T2M_MAX"]), valid(g["GWETROOT"])
            if r:
                rain.append(sum(r))  # tổng mưa cả tháng của năm đó
            if t:
                hot.append(sum(v >= HOT_C for v in t))  # số ngày nóng trong tháng đó
            if w:
                root.append(sum(w) / len(w))  # độ ẩm rễ trung bình tháng đó
        months.append({"month": month, "rainMm": spread(rain), "hotDays": spread(hot), "rootWetness": spread(root)})
    return months


def missing_days(days):
    return sum(any(v == FILL for v in values.values()) for values in days.values())


# ---------------------------------------------------------------------------
# Phần 4: vẽ - mỗi huyện một hàng, 3 cột: mưa, ngày nóng, ẩm vùng rễ
# ---------------------------------------------------------------------------

def draw(results):
    fig, axes = plt.subplots(len(results), 3, figsize=(13, 2.3 * len(results)), sharex=True, sharey="col", layout="constrained")
    x = np.arange(1, 13)
    columns = [("rainMm", "Mưa (mm/tháng)", WATER), ("hotDays", f"Ngày ≥ {HOT_C:g} °C", HEAT), ("rootWetness", "Ẩm vùng rễ (0–1)", WATER)]
    for row, r in zip(axes, results):
        for ax, (key, title, color) in zip(row, columns):
            mean = [m[key]["mean"] for m in r["months"]]
            p10 = [m[key]["p10"] for m in r["months"]]
            p90 = [m[key]["p90"] for m in r["months"]]
            if key == "rootWetness":
                ax.plot(x, mean, color=color, linewidth=2)
                ax.fill_between(x, p10, p90, color=color, alpha=0.15, linewidth=0)
            else:
                ax.bar(x, mean, color=color, width=0.7)
                ax.vlines(x, p10, p90, color=INK, linewidth=1)  # khoảng 10–90% giữa các năm
            ax.set_title(f"{r['name'].split(' · ')[1]}: {title}", loc="left", fontsize=10, fontweight="bold", color=INK)
            ax.grid(axis="y", color=GRID)
            ax.tick_params(colors=MUTED, labelsize=8)
            for side in ("top", "right"):
                ax.spines[side].set_visible(False)
    for ax in axes[-1]:
        ax.set_xticks(x, [f"T{m}" for m in x])
    fig.suptitle(f"Khí hậu theo tháng, NASA POWER (ước tính mô hình), {FIRST_YEAR}–{LAST_YEAR}. "
                 "Cột/đường = trung bình, vạch/vùng mờ = khoảng 10–90% giữa các năm",
                 x=0.01, ha="left", fontsize=11, fontweight="bold", color=INK)
    return fig


# ---------------------------------------------------------------------------
# Phần 5: chạy
# ---------------------------------------------------------------------------

def main():
    results, raw_days = [], {}
    for district in DISTRICTS:
        print(f"Đang tải {district['name']} ...")
        days = fetch_daily(district)
        raw_days[district["id"]] = days
        print(f"   {len(days)} ngày, {missing_days(days)} ngày có giá trị trống")
        results.append({**district, "days": len(days), "missingDays": missing_days(days), "months": monthly_climate(days)})

    # POWER có ô lưới thô (~nửa độ): hai huyện gần nhau có thể rơi vào cùng một ô
    for i, a in enumerate(results):
        same = [b["id"] for b in results[:i] if raw_days[b["id"]] == raw_days[a["id"]]]
        a["sameGridCellAs"] = same
        if same:
            print(f"Lưu ý: {a['name']} trùng số liệu với {same} (cùng ô lưới POWER)")

    print("\nTrung bình theo tháng (T1 → T12):")
    for r in results:
        print(f"{r['name']}")
        print("   mưa mm  :", " ".join(f"{m['rainMm']['mean']:5.0f}" for m in r["months"]))
        print("   ngày≥35 :", " ".join(f"{m['hotDays']['mean']:5.1f}" for m in r["months"]))
        print("   ẩm rễ   :", " ".join(f"{m['rootWetness']['mean']:5.2f}" for m in r["months"]))

    output = {
        "source": "NASA POWER Daily API (point), community AG",
        "api": API,
        "parameters": PARAMS,
        "label": "NASA POWER (model estimate) - not a SMAP or rain-gauge measurement",
        "resolution": "coarse grid (about half a degree); describes an area, not a single field",
        "years": [FIRST_YEAR, LAST_YEAR],
        "timeStandard": "LST",
        "hotDayThresholdC": HOT_C,
        "spread": "p10 and p90 across years: 8 in 10 years fall inside [p10, p90]",
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "districts": results,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    draw(results).savefig(OUT_PNG, dpi=150, bbox_inches="tight")
    print(f"\nĐã lưu {OUT_JSON}\nĐã lưu {OUT_PNG}")


if __name__ == "__main__":
    main()
