"""Bước 6: lịch mùa vụ NDVI + khí hậu NASA POWER cho 13 tỉnh/thành ĐBSCL (ngoài 5 huyện mẫu).

Vì sao: thửa cách huyện mẫu hơn 15 km trước đây "chưa có lịch vụ", nên không xếp hạng được phương án.
Ở đây dùng LẠI ĐÚNG các bước đã có (không viết thuật toán mới):
  - fetch_ndvi.fetch_district      : MODIS MOD13Q1 250 m qua ORNL DAAC (NASA), khối 9x9 ô quanh điểm
  - calendar_rule.analyse          : làm mượt + đếm đỉnh vụ theo luật ngưỡng (cùng tham số)
  - calendar_kmeans (tâm nhóm cũ)  : gán hồ sơ năm vào nhóm k-means GẦN NHẤT đã lưu, KHÔNG chạy lại k-means
                                     → 5 huyện mẫu và các test hồi quy giữ nguyên
  - compare_methods.sensitivity    : độ nhạy số vụ/năm theo cửa sổ làm mượt và độ nhô đỉnh
  - fetch_power_climate            : khí hậu tháng NASA POWER (mưa, ngày nóng, ẩm vùng rễ GWETROOT)
Điểm của mỗi tỉnh = `center` trong site/data/mekongBoundaries.js (tâm ranh tỉnh), KHÔNG phải ruộng chọn tay.
Điểm rơi vào đô thị/sông thì khối 9x9 thiếu ô hợp lệ → để thiếu, không lấp.

Chạy từ thư mục gốc dự án:
    python scripts/python/province_calendars.py
Ghi:  site/data/precomputed/province_calendars.json
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import calendar_rule  # noqa: E402
import compare_methods  # noqa: E402
import fetch_ndvi  # noqa: E402
import fetch_power_climate  # noqa: E402

ROOT = HERE.parents[1]
PRE = ROOT / "site" / "data" / "precomputed"
OUT_JSON = PRE / "province_calendars.json"
BOUNDARIES = ROOT / "site" / "data" / "mekongBoundaries.js"
IMAGES_PER_YEAR = 23  # MOD13Q1: 1 ảnh mỗi 16 ngày (giống calendar_kmeans.py)
# Lưu tạm từng tỉnh: chạy lại sau khi mất mạng/ngắt giữa chừng thì không phải tải lại tỉnh đã xong.
CACHE = ROOT / ".preview" / "province-cache"


def cached(name, fetch):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{name}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    data = fetch()
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def load_provinces():
    """Đọc mã, tên và tâm của 13 tỉnh từ file ranh giới (một nguồn duy nhất cho cả web và script)."""
    text = BOUNDARIES.read_text(encoding="utf-8")
    line = next(l for l in text.splitlines() if l.startswith("export const MEKONG_PROVINCES_GEO = "))
    data = json.loads(re.sub(r"^export const MEKONG_PROVINCES_GEO = ", "", line).rstrip(";"))
    # Mã tỉnh trùng mã huyện mẫu (vd. "cantho") → thêm tiền tố "p-" để không lẫn với 5 huyện mẫu.
    return [{"id": f"p-{p['code']}", "code": p["code"], "name": p["vi"], "nameEn": p["en"],
             "lat": p["center"][0], "lon": p["center"][1]} for p in data]


def nearest_cluster(profile, clusters):
    """Nhóm k-means có tâm gần nhất (khoảng cách Euclid, đúng như KMeans.predict)."""
    dists = [float(np.linalg.norm(np.array(profile) - np.array(c["centroid"]))) for c in clusters]
    best = int(np.argmin(dists))
    return clusters[best]["cluster"], round(dists[best], 3)


def yearly(series):
    values = calendar_rule.fill_gaps([r["ndvi"] for r in series])
    years = [r["date"][:4] for r in series]
    out = {}
    for year in sorted(set(years)):
        row = [v for v, y in zip(values, years) if y == year]
        if len(row) == IMAGES_PER_YEAR:
            out[int(year)] = row
    return out


def main():
    kmeans = json.loads((PRE / "calendar_kmeans.json").read_text(encoding="utf-8"))
    clusters = kmeans["clusters"]
    provinces = load_provinces()
    first, last = fetch_ndvi.FIRST_YEAR, fetch_ndvi.LAST_YEAR
    results = []
    total = len(provinces)
    for n, p in enumerate(provinces, 1):
        print(f"[{n}/{total}] NDVI MODIS {p['name']} ({p['lat']}, {p['lon']}) ...", flush=True)
        series = cached(f"{p['id']}-ndvi", lambda: fetch_ndvi.fetch_district(p))
        missing = sum(r["ndvi"] is None for r in series)
        entry = {**p, "images": len(series), "missingImages": missing}
        # Hơn một nửa số ảnh thiếu → điểm tâm tỉnh không đại diện cho ruộng (đô thị/sông): để thiếu.
        if missing > len(series) / 2:
            print(f"   {missing}/{len(series)} ảnh thiếu → bỏ, không tính lịch vụ")
            entry["calendar"] = None
            entry["reason"] = "too many missing NDVI images at the province centre"
        else:
            rule, _ = calendar_rule.analyse({**p, "series": series}, first, last)
            per_year = yearly(series)
            assign = {str(y): nearest_cluster(row, clusters) for y, row in per_year.items()}
            last_year = max(per_year) if per_year else None
            sens = compare_methods.sensitivity({"districts": [{**p, "series": series}]})[p["id"]]
            entry["calendar"] = {
                "rule": {k: rule[k] for k in ("cyclesPerYear", "meanCyclesPerYear", "yearsWithThreeCycles", "peakDates", "bareWindows", "monthly")},
                "kmeansByYear": {y: {"cluster": c, "distance": d} for y, (c, d) in assign.items()},
                "calendarYear": last_year,
                "calendarCluster": assign[str(last_year)][0] if last_year else None,
                "sensitivity": {"min": sens["min"], "max": sens["max"]},
            }
            print(f"   {len(series)} ảnh, {missing} thiếu · số vụ/năm {rule['meanCyclesPerYear']} · nhóm năm {last_year}: {entry['calendar']['calendarCluster']}")
        print(f"[{n}/{total}] NASA POWER {p['name']} ...", flush=True)
        days = cached(f"{p['id']}-power", lambda: fetch_power_climate.fetch_daily(p))
        print(f"[{n}/{total}] XONG {p['name']}", flush=True)
        entry["climate"] = {"days": len(days), "missingDays": fetch_power_climate.missing_days(days), "months": fetch_power_climate.monthly_climate(days)}
        results.append(entry)

    output = {
        "source": {
            "ndvi": "MODIS MOD13Q1, 250 m, 16-day composite, via ORNL DAAC MODIS subset REST API (NASA)",
            "ndviApi": fetch_ndvi.API,
            "climate": "NASA POWER Daily API (point), community AG",
            "climateApi": fetch_power_climate.API,
        },
        "method": "Same rule-based peak detection (calendar_rule.py params) and nearest saved k-means centroid (calendar_kmeans.json, not refitted); sensitivity grid from compare_methods.py; NDVI = median of the 9x9 block of 250 m pixels around the province centre.",
        "pointNote": "Province centre from mekongBoundaries.js; a 2 km block around one point, not a farm survey. Province-level calendar only.",
        "years": [first, last],
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "provinces": results,
    }
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"HOAN TAT: đã lưu {OUT_JSON}", flush=True)


if __name__ == "__main__":
    main()
