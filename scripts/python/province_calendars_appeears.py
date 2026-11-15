"""Lịch vụ cấp tỉnh từ file NASA AppEEARS (Point Sample, MOD13Q1.061) do người dùng tự tải.

Vì sao có file này: máy chủ ORNL DAAC quá chậm; AppEEARS (NASA LP DAAC) cho tải cùng sản phẩm MOD13Q1 250 m.
Khác cách cũ ở MỘT điểm, ghi rõ trong JSON: AppEEARS trả 1 ô 250 m tại tâm tỉnh (không phải trung vị khối 9x9 ô),
nên lọc mây bằng cột chất lượng chính thức "pixel_reliability" của MODIS:
  0 = Good data, 1 = Marginal data  → giữ
  2 = Snow/Ice, 3 = Cloudy, -1 = Fill/No data → coi là ảnh thiếu (lấp bằng đúng fill_gaps của calendar_rule.py)
Mọi bước sau giữ nguyên: luật đỉnh vụ (calendar_rule.py), tâm nhóm k-means đã lưu (không chạy lại), độ nhạy
(compare_methods.py), khí hậu NASA POWER (fetch_power_climate.py).

Chạy từ thư mục gốc dự án:
    python scripts/python/province_calendars_appeears.py "D:/Users/danph/Downloads/mekong-13-tinh-MOD13Q1-061-results.csv"
Ghi:  site/data/precomputed/province_calendars.json
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import fetch_ndvi  # noqa: E402
import province_calendars as pc  # noqa: E402

GOOD_RELIABILITY = {0, 1}  # 0 = Good data, 1 = Marginal data (MOD13Q1 pixel reliability)
COL_NDVI = "MOD13Q1_061__250m_16_days_NDVI"
COL_REL = "MOD13Q1_061__250m_16_days_pixel_reliability"


def read_series(csv_path):
    """CSV AppEEARS → { mã tỉnh: [ {date, ndvi, validPixels, reliability} ] } trong 2021–2025."""
    out = {}
    with open(csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            date = row["Date"]
            if not (fetch_ndvi.FIRST_YEAR <= int(date[:4]) <= fetch_ndvi.LAST_YEAR):
                continue
            rel = int(float(row[COL_REL]))
            ndvi = float(row[COL_NDVI])
            keep = rel in GOOD_RELIABILITY and -0.2 <= ndvi <= 1.0  # khoảng hợp lệ giống fetch_ndvi (-2000..10000 × 0.0001)
            out.setdefault(row["ID"], []).append({"date": date, "ndvi": round(ndvi, 4) if keep else None, "validPixels": 1 if keep else 0, "reliability": rel})
    for rows in out.values():
        rows.sort(key=lambda r: r["date"])
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit("Thiếu đường dẫn file CSV AppEEARS")
    csv_path = Path(sys.argv[1])
    raw = csv_path.read_bytes()
    series = read_series(csv_path)
    provinces = pc.load_provinces()
    for p in provinces:
        rows = series.get(p["code"])
        if not rows:
            print(f"   {p['name']}: không có trong file CSV", flush=True)
            continue
        kept = sum(r["ndvi"] is not None for r in rows)
        print(f"   {p['name']}: {len(rows)} ảnh, giữ {kept} ảnh tốt/dùng được", flush=True)
        # Ghi đè bản lưu NDVI của tỉnh để pc.main() dùng đúng chuỗi AppEEARS (không gọi ORNL).
        pc.CACHE.mkdir(parents=True, exist_ok=True)
        (pc.CACHE / f"{p['id']}-ndvi.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    pc.main()  # luật đỉnh vụ + nhóm k-means đã lưu + độ nhạy + NASA POWER (nhanh) → province_calendars.json

    out = json.loads(pc.OUT_JSON.read_text(encoding="utf-8"))
    out["source"]["ndvi"] = "NASA MODIS MOD13Q1.061, 250 m, 16-day composite, via NASA AppEEARS Point Sample (LP DAAC)"
    out["source"]["ndviApi"] = "https://appeears.earthdatacloud.nasa.gov"
    out["source"]["ndviFile"] = {"name": csv_path.name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
    out["method"] = ("Single 250 m MOD13Q1 pixel at each province centre (AppEEARS point sample); images with pixel_reliability "
                     "not in {0 Good, 1 Marginal} treated as missing and gap-filled with calendar_rule.fill_gaps; then the same "
                     "rule-based peak detection, nearest saved k-means centroid (not refitted) and sensitivity grid as the 5 sample districts.")
    out["pointNote"] = "Province centre from mekongBoundaries.js; ONE 250 m pixel (not a 2 km block, not a farm survey). Province-level calendar only."
    pc.OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"HOAN TAT: {pc.OUT_JSON}", flush=True)


if __name__ == "__main__":
    main()
