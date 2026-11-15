"""Chạy nhanh + bền province_calendars.py: tải NDVI MODIS (ORNL DAAC) cho 13 tỉnh, tối đa 3 luồng.

Vì sao: 13 luồng cùng lúc làm ORNL cắt kết nối hàng loạt (502/503/ConnectionResetError 10054).
Ở đây:
  - tối đa 3 luồng, mỗi luồng một requests.Session() giữ kết nối (keep-alive);
  - thử lại tối đa 6 lần, chờ tăng dần (2, 4, 8, 16, 32 s) CHỈ khi lỗi mạng / 429 / 5xx;
  - lưu tạm TỪNG NHÓM 10 NGÀY ảnh vào .preview/province-cache/<tỉnh>/: ngắt giữa chừng thì chạy lại sẽ nối tiếp
    đúng nhóm còn thiếu.
Cùng nguồn (MOD13Q1 250 m), cùng tham số (khối 9x9 ô, trung vị, MIN_PIXELS) với fetch_ndvi.py; chỉ đổi cách gọi mạng.
Xong phần NDVI thì gọi province_calendars.main() (dùng lại bản lưu + NASA POWER) để ghi
site/data/precomputed/province_calendars.json.

Chạy: python -u scripts/python/province_calendars_fast.py
"""
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_ndvi as fn  # noqa: E402
import province_calendars as pc  # noqa: E402

MAX_WORKERS = 3
MAX_TRIES = 6
TIMEOUT_S = 180  # ORNL đang trả mỗi lượt ~75 s
RETRY_STATUS = {429, 500, 502, 503, 504}
_local = threading.local()


def session():
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
        _local.s.headers.update({"Accept": "application/json"})
    return _local.s


def get_json(url, params):
    for attempt in range(1, MAX_TRIES + 1):
        try:
            res = session().get(url, params=params, timeout=TIMEOUT_S)
            if res.status_code in RETRY_STATUS:
                raise requests.HTTPError(f"HTTP {res.status_code}")
            res.raise_for_status()
            return res.json()
        except (requests.RequestException, ConnectionError) as err:
            if attempt == MAX_TRIES:
                raise
            wait = 2 ** attempt
            print(f"   thử lại {attempt}/{MAX_TRIES - 1} sau {wait} s: {err}", flush=True)
            _local.s = requests.Session()  # kết nối bị reset → mở phiên mới
            time.sleep(wait)


def read_cache(path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def write_cache(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def fetch_province(p):
    """Giống fn.fetch_district nhưng lưu từng nhóm ngày; trả về chuỗi NDVI đã sắp theo ngày."""
    final = pc.CACHE / f"{p['id']}-ndvi.json"
    if final.exists():
        return read_cache(final)
    folder = pc.CACHE / p["id"]
    dates_file = folder / "dates.json"
    dates = read_cache(dates_file)
    if dates is None:
        data = get_json(f"{fn.API}/dates", {"latitude": p["lat"], "longitude": p["lon"]})
        dates = [d for d in data["dates"] if fn.FIRST_YEAR <= int(d["calendar_date"][:4]) <= fn.LAST_YEAR]
        write_cache(dates_file, dates)
    rows = []
    groups = list(fn.chunks(dates, fn.MAX_DATES_PER_REQUEST))
    for k, group in enumerate(groups, 1):
        chunk_file = folder / f"chunk-{group[0]['modis_date']}.json"
        chunk = read_cache(chunk_file)
        if chunk is None:
            params = {"latitude": p["lat"], "longitude": p["lon"], "band": fn.BAND,
                      "startDate": group[0]["modis_date"], "endDate": group[-1]["modis_date"],
                      "kmAboveBelow": fn.KM_AROUND, "kmLeftRight": fn.KM_AROUND}
            data = get_json(f"{fn.API}/subset", params)
            chunk = []
            for item in data["subset"]:
                ndvi, valid = fn.median_ndvi(item["data"])
                chunk.append({"date": item["calendar_date"], "ndvi": ndvi, "validPixels": valid})
            write_cache(chunk_file, chunk)
            print(f"   {p['name']}: nhóm {k}/{len(groups)} xong", flush=True)
        rows.extend(chunk)
    rows.sort(key=lambda r: r["date"])
    write_cache(final, rows)
    return rows


if __name__ == "__main__":
    provinces = pc.load_provinces()
    failed = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs = {pool.submit(fetch_province, p): p for p in provinces}
        for i, f in enumerate(as_completed(futs), 1):
            p = futs[f]
            try:
                f.result()
                print(f"[{i}/{len(provinces)}] NDVI xong: {p['name']}", flush=True)
            except Exception as err:
                failed.append(p["name"])
                print(f"[{i}/{len(provinces)}] LỖI {p['name']}: {err}", flush=True)
    if failed:
        print(f"CHƯA XONG: {', '.join(failed)} — chạy lại lệnh này để nối tiếp phần còn thiếu.", flush=True)
        sys.exit(1)
    pc.main()  # NDVI đã có trong bản lưu; tải NASA POWER rồi ghi province_calendars.json
