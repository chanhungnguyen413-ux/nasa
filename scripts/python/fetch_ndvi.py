"""Bước 1: tải NDVI MODIS (MOD13Q1) 5 năm cho 5 huyện, lưu ra JSON.

Chạy từ thư mục gốc dự án:
    python scripts/python/fetch_ndvi.py
Kết quả:
    site/data/precomputed/ndvi_raw.json
"""

import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Phần 1: cấu hình
# ---------------------------------------------------------------------------

# Toạ độ chép từ site/data/demo.js (PROVINCES). Sửa ở đó thì sửa cả ở đây.
DISTRICTS = [
    {"id": "cantho", "name": "Cần Thơ · Cờ Đỏ", "lat": 10.1, "lon": 105.43},
    {"id": "angiang", "name": "An Giang · Thoại Sơn", "lat": 10.3, "lon": 105.26},
    {"id": "soctrang", "name": "Sóc Trăng · Mỹ Tú", "lat": 9.62, "lon": 105.83},
    {"id": "dongthap", "name": "Đồng Tháp · Tháp Mười", "lat": 10.55, "lon": 105.83},
    {"id": "bentre", "name": "Bến Tre · Chợ Lách", "lat": 10.25, "lon": 106.13},
]

FIRST_YEAR = 2021
LAST_YEAR = 2025  # 5 năm trọn vẹn, mỗi năm 23 ảnh 16 ngày

API = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
BAND = "250m_16_days_NDVI"
SCALE = 0.0001  # hệ số đổi số nguyên sang NDVI (theo /MOD13Q1/bands)
VALID_MIN, VALID_MAX = -2000, 10000  # khoảng hợp lệ; -3000 là "không có dữ liệu"
MAX_DATES_PER_REQUEST = 10  # giới hạn ghi trong tài liệu API của ORNL DAAC
KM_AROUND = 1  # 1 km mỗi phía -> lưới 9x9 ô 250 m (khoảng 2 km x 2 km)
MIN_PIXELS = 41  # cần hơn nửa trong 81 ô hợp lệ thì mới tin giá trị trung vị

ROOT = Path(__file__).resolve().parents[2]
OUT_FILE = ROOT / "site" / "data" / "precomputed" / "ndvi_raw.json"


# ---------------------------------------------------------------------------
# Phần 2: gọi API an toàn (thử lại khi mạng lỗi)
# ---------------------------------------------------------------------------

def get_json(url, params):
    for attempt in range(1, 4):
        try:
            res = requests.get(url, params=params, headers={"Accept": "application/json"}, timeout=60)
            res.raise_for_status()
            return res.json()
        except requests.RequestException as err:
            print(f"   lỗi lần {attempt}: {err}")
            time.sleep(5 * attempt)
    raise RuntimeError(f"Không tải được {url}")


# ---------------------------------------------------------------------------
# Phần 3: hỏi API những ngày ảnh nào có sẵn, chỉ giữ 5 năm cần dùng
# ---------------------------------------------------------------------------

def list_dates(lat, lon):
    data = get_json(f"{API}/dates", {"latitude": lat, "longitude": lon})
    return [d for d in data["dates"] if FIRST_YEAR <= int(d["calendar_date"][:4]) <= LAST_YEAR]


def chunks(items, size):
    """Cắt danh sách thành từng nhóm nhỏ, mỗi nhóm tối đa `size` phần tử."""
    for i in range(0, len(items), size):
        yield items[i : i + size]


# ---------------------------------------------------------------------------
# Phần 4: tải từng nhóm 10 ngày, lấy trung vị của 81 ô
# ---------------------------------------------------------------------------

def median_ndvi(raw_values):
    pixels = [v for v in raw_values if VALID_MIN <= v <= VALID_MAX]
    if len(pixels) < MIN_PIXELS:
        return None, len(pixels)
    return round(statistics.median(pixels) * SCALE, 4), len(pixels)


def fetch_district(district):
    dates = list_dates(district["lat"], district["lon"])
    rows = []
    for group in chunks(dates, MAX_DATES_PER_REQUEST):
        params = {
            "latitude": district["lat"],
            "longitude": district["lon"],
            "band": BAND,
            "startDate": group[0]["modis_date"],
            "endDate": group[-1]["modis_date"],
            "kmAboveBelow": KM_AROUND,
            "kmLeftRight": KM_AROUND,
        }
        data = get_json(f"{API}/subset", params)
        for item in data["subset"]:
            ndvi, valid = median_ndvi(item["data"])
            rows.append({"date": item["calendar_date"], "ndvi": ndvi, "validPixels": valid})
        print(f"   xong {group[0]['calendar_date']} -> {group[-1]['calendar_date']}")
        time.sleep(1)  # nghỉ 1 giây cho lịch sự với máy chủ
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------------
# Phần 5: chạy cho 5 huyện và ghi file JSON
# ---------------------------------------------------------------------------

def main():
    result = {
        "source": "MODIS MOD13Q1, 250 m, 16-day composite, via ORNL DAAC MODIS subset REST API",
        "api": API,
        "band": BAND,
        "method": "median of the 9x9 block of 250 m pixels (about 2 km x 2 km) around each point",
        "years": [FIRST_YEAR, LAST_YEAR],
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "districts": [],
    }
    for district in DISTRICTS:
        print(f"Đang tải {district['name']} ...")
        rows = fetch_district(district)
        missing = sum(r["ndvi"] is None for r in rows)
        print(f"   {len(rows)} ảnh, {missing} ảnh thiếu dữ liệu")
        result["districts"].append({**district, "series": rows})

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Đã lưu {OUT_FILE}")


if __name__ == "__main__":
    main()
