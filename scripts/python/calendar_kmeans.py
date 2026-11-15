"""Bước 4: tìm lịch mùa vụ bằng K-MEANS, rồi so sánh với luật ngưỡng.

Ý tưởng: mỗi "năm của một huyện" là một đường NDVI gồm 23 ảnh. K-means xếp các
đường có HÌNH DẠNG giống nhau vào cùng một nhóm, mà không cần ai dạy trước
"thế nào là 3 vụ". Sau đó ta xem mỗi nhóm trông như thế nào.

Chạy từ thư mục gốc dự án (cần chạy calendar_rule.py trước):
    python scripts/python/calendar_kmeans.py
Đọc:  site/data/precomputed/ndvi_raw.json, calendar_rule.json
Ghi:  site/data/precomputed/calendar_kmeans.json
      scripts/python/output/calendar_kmeans.png
"""

import json
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.signal import find_peaks
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Dùng lại hàm và tham số của luật ngưỡng để mô tả nhóm bằng cùng một thước đo
from calendar_rule import BARE_NDVI, PEAK_MIN_GAP, PEAK_MIN_NDVI, PEAK_PROMINENCE, fill_gaps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PRE = ROOT / "site" / "data" / "precomputed"
IN_FILE, RULE_FILE, OUT_JSON = PRE / "ndvi_raw.json", PRE / "calendar_rule.json", PRE / "calendar_kmeans.json"
OUT_PNG = HERE / "output" / "calendar_kmeans.png"

# ---------------------------------------------------------------------------
# Phần 1: tham số
# ---------------------------------------------------------------------------

IMAGES_PER_YEAR = 23  # MOD13Q1: 1 ảnh mỗi 16 ngày
K_RANGE = range(2, 7)  # thử từ 2 đến 6 nhóm, chọn số nhóm tốt nhất
SEED = 0  # cố định "hạt giống" ngẫu nhiên để chạy lại ra đúng kết quả cũ

LINE, INK, MUTED, GRID = "#1f6b3c", "#10231a", "#5a6b61", "#e2e8e1"
MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]  # ngày thứ mấy trong năm


# ---------------------------------------------------------------------------
# Phần 2: cắt chuỗi 5 năm thành từng "hồ sơ năm" 23 giá trị
# ---------------------------------------------------------------------------

def yearly_profiles(data):
    profiles, labels = [], []
    for district in data["districts"]:
        values = fill_gaps([r["ndvi"] for r in district["series"]])
        years = [r["date"][:4] for r in district["series"]]
        for year in sorted(set(years)):
            row = [v for v, y in zip(values, years) if y == year]
            if len(row) != IMAGES_PER_YEAR:
                print(f"   bỏ qua {district['name']} {year}: chỉ có {len(row)} ảnh")
                continue
            profiles.append(row)
            labels.append({"id": district["id"], "name": district["name"], "year": int(year)})
    return np.array(profiles), labels


# ---------------------------------------------------------------------------
# Phần 3: chọn số nhóm k bằng điểm silhouette, rồi chạy k-means
# ---------------------------------------------------------------------------

def choose_k(X):
    scores = {}
    for k in K_RANGE:
        model = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(X)
        scores[k] = round(float(silhouette_score(X, model.labels_)), 3)
    best = max(scores, key=scores.get)
    return best, scores


def describe(centroid):
    """Mô tả 'đường trung tâm' của một nhóm bằng đúng thước đo của luật ngưỡng.

    Một năm là vòng tròn: T12 nối liền T1. Nếu đếm thẳng, đỉnh nằm sát mép bị bỏ sót.
    Nên nối 3 bản liền nhau [năm, năm, năm] rồi chỉ giữ các đỉnh ở bản giữa.
    """
    n = len(centroid)
    looped = np.concatenate([centroid, centroid, centroid])
    found, _ = find_peaks(looped, height=PEAK_MIN_NDVI, prominence=PEAK_PROMINENCE, distance=PEAK_MIN_GAP)
    peaks = [p - n for p in found if n <= p < 2 * n]
    return {
        "peaks": len(peaks),
        "peakDayOfYear": [1 + 16 * int(p) for p in peaks],
        "bareImages": int((centroid < BARE_NDVI).sum()),
        "amplitude": round(float(centroid.max() - centroid.min()), 3),
    }


# ---------------------------------------------------------------------------
# Phần 4: so sánh với luật ngưỡng (bảng chéo: nhóm k-means x số vụ theo luật)
# ---------------------------------------------------------------------------

def rule_cycles(rule):
    return {(d["id"], int(y)): c for d in rule["districts"] for y, c in d["cyclesPerYear"].items()}


# ---------------------------------------------------------------------------
# Phần 5: vẽ mỗi nhóm một ô: các đường thành viên mờ + đường trung tâm đậm
# ---------------------------------------------------------------------------

def draw(X, assign, clusters):
    doy = [1 + 16 * i for i in range(IMAGES_PER_YEAR)]
    fig, axes = plt.subplots(len(clusters), 1, figsize=(10, 2.6 * len(clusters)), sharex=True, sharey=True, layout="constrained")
    axes = np.atleast_1d(axes)
    for ax, c in zip(axes, clusters):
        for row in X[assign == c["index"]]:
            ax.plot(doy, row, color=MUTED, linewidth=1, alpha=0.45)
        ax.plot(doy, c["centroid"], color=LINE, linewidth=2.5)
        ax.axhline(BARE_NDVI, color=MUTED, linewidth=1, linestyle="--")
        names = ", ".join(sorted({m["name"].split(" · ")[1] for m in c["members"]}))
        ax.set_title(f"Nhóm {c['cluster']}: {len(c['members'])} năm-huyện, {c['shape']['peaks']} đỉnh ({names})",
                     loc="left", fontsize=11, fontweight="bold", color=INK)
        ax.set_ylim(-0.1, 1.0)
        ax.set_ylabel("NDVI", color=MUTED)
        ax.grid(axis="y", color=GRID)
        ax.tick_params(colors=MUTED)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
    axes[-1].set_xticks(MONTH_STARTS, [f"T{m}" for m in range(1, 13)])
    fig.suptitle("K-means trên hồ sơ NDVI từng năm (đường đậm = trung tâm nhóm, nét đứt = ngưỡng đất trống)",
                 x=0.01, ha="left", fontsize=12, fontweight="bold", color=INK)
    return fig


# ---------------------------------------------------------------------------
# Phần 6: chạy
# ---------------------------------------------------------------------------

def main():
    data = json.loads(IN_FILE.read_text(encoding="utf-8"))
    rule = json.loads(RULE_FILE.read_text(encoding="utf-8"))
    X, labels = yearly_profiles(data)
    print(f"{len(X)} hồ sơ năm, mỗi hồ sơ {X.shape[1]} giá trị")

    k, scores = choose_k(X)
    print("Điểm silhouette theo k:", scores, "-> chọn k =", k)
    model = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(X)
    assign = model.labels_

    cycles = rule_cycles(rule)
    clusters = []
    for i in range(k):
        members = [labels[j] for j in range(len(labels)) if assign[j] == i]
        centroid = model.cluster_centers_[i]
        clusters.append({
            "index": i,
            "cluster": i + 1,
            "members": members,
            "centroid": [round(float(v), 3) for v in centroid],
            "shape": describe(centroid),
            "ruleCyclesOfMembers": dict(Counter(cycles[(m["id"], m["year"])] for m in members)),
        })

    print("\nNhóm | số thành viên | đỉnh của đường trung tâm | số vụ theo luật ngưỡng của các thành viên")
    for c in clusters:
        rule_mix = ", ".join(f"{n} vụ: {cnt}" for n, cnt in sorted(c["ruleCyclesOfMembers"].items()))
        print(f"  {c['cluster']}  | {len(c['members']):2} | {c['shape']['peaks']} | {rule_mix}")

    print("\nBảng nhóm theo huyện và năm:")
    years = sorted({l["year"] for l in labels})
    print(f"{'':28}" + " ".join(str(y) for y in years))
    for district in data["districts"]:
        row = [str(assign[j] + 1) for j, l in enumerate(labels) if l["id"] == district["id"]]
        print(f"{district['name']:28}" + "    ".join(row))

    output = {
        "method": "k-means on yearly NDVI profiles (23 values per district-year), k chosen by silhouette score",
        "params": {"kRange": list(K_RANGE), "chosenK": k, "seed": SEED, "nInit": 10},
        "silhouette": {str(kk): s for kk, s in scores.items()},
        "source": data["source"],
        "clusters": [{key: v for key, v in c.items() if key != "index"} for c in clusters],
    }
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    draw(X, assign, clusters).savefig(OUT_PNG, dpi=150, bbox_inches="tight")
    print(f"\nĐã lưu {OUT_JSON}\nĐã lưu {OUT_PNG}")


if __name__ == "__main__":
    main()
