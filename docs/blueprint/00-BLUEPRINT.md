# Blueprint nâng cấp "Mùa Vụ Mekong" (giao cho Opus 5.5)

Ngày viết: 13/11/2026. Người duyệt: Hưng. Thi: NASA Space Apps 14–15/11/2026, đề "Field Shift: Adapting Farms with NASA Data".

## 0. Cách dùng

- Mỗi phase là **một phiên Claude Code mới**, model Opus 5.5. Chỉ cần gõ: `Đọc docs/blueprint/phase-N.md và thực hiện.` File `CLAUDE.md` ở gốc project tự được nạp và chứa các bất biến.
- Thứ tự: Phase 0 → 1 → 2 → 3 → 4. **Sau Phase 1 đã có demo chạy được.** Mỗi phase kết thúc ở trạng thái build được, test qua, đã commit.
- Mỗi việc có nhãn **[B]** bắt buộc, **[N]** nên có, **[C]** nếu còn giờ. Hết giờ thì dừng sau nhóm [B], vẫn phải bàn giao đủ.
- Blueprint là **hợp đồng, không phải kịch bản**: phần cố định là bất biến, cấu trúc dữ liệu, công thức có nguồn và tiêu chí nghiệm thu. Cách cài đặt, đặt tên bên trong module, chi tiết giao diện do Opus quyết. Nếu một mục trong blueprint mâu thuẫn với thực tế (API chết, nguồn không có số liệu), **bất biến thắng**; ghi sai lệch vào `STATE.md`.
- Dữ liệu nhóm đang xử lý **không phải điều kiện** của phase nào. Mọi thứ phải chạy được chỉ với API mở và dữ liệu đã tính sẵn trong repo.

## 1. Kiểm toán code hiện có

| Thành phần | File | Hiện trạng | Quyết định |
|---|---|---|---|
| So sánh luân canh | `site/logic/rotation.js`, `rotationInputs.js`, `site/data/rotationCrops.js`, `site/i18n/rotationText.js` | Hàm thuần, số liệu thật, mỗi con số có `src`, đủ 5 phần giải trình + độ tin cậy | **Giữ nguyên hành vi**, mở rộng ở Phase 3 |
| Dải mùa vụ 12 tháng | `site/logic/seasonStrip.js` | Tháng trống/ngập và tháng dễ tổn thương từ NDVI + POWER | **Giữ**, tái dùng trên biểu đồ mới |
| Pipeline Python | `scripts/python/*.py` → `site/data/precomputed/*.json` | MODIS NDVI 2021–2025, POWER 2001–2025, hai phương pháp lịch vụ có so sánh | **Giữ**, không sửa |
| Dữ liệu trực tiếp | `site/data/live.js` | POWER daily, Open-Meteo, MODIS ORNL, cache localStorage | **Giữ**, tách phần dùng lại |
| Bảng điều khiển tưới | `site/logic/engine.js`, `site/data/demo.js`, `site/data/crops.js`, `adviceText.js` | 4 thửa minh họa; một giá trị ô lưới chia cho 4 thửa bằng `PLOT_SPREAD`; ngưỡng cây là ước lượng; điểm hạn hiệu chỉnh theo demo | **Thay thế**: ẩn ở Phase 1, xóa ở Phase 4. Giữ lại `PROVINCES` |
| Bản đồ | `farmSvg()` trong `template.html` | Hình SVG minh họa, không có tọa độ | **Thay** bằng bản đồ thật |
| Trang Thời tiết | `renderWeather`, `renderWhatIf` | Dựa trên dữ liệu demo 7 ngày | **Thay** bằng biểu đồ khí hậu + what-if mới; giữ dự báo Open-Meteo 7 ngày |
| Giao diện, song ngữ, thuật ngữ | `template.html`, `site/i18n/*`, `DESIGN.md` | Hệ thống thiết kế hoàn chỉnh, VI/EN đủ, popover thuật ngữ | **Giữ** |
| Trợ lý AI | `server/server.mjs`, `assistantFallback.js` | Gemini, chưa có `.env.local` nên đang chạy câu mẫu | **Giữ**, thêm kiểm số ở Phase 4 |
| Build | `scripts/build-site.mjs` | Ghép mọi module vào một `index.html`, bỏ `import/export` | **Giữ**, mở rộng danh sách module |
| Hạ tầng | — | Không có git; test là script in ra màn hình | **Sửa ở Phase 0** |

Chưa có gì cho: upload dữ liệu, chuẩn hóa lưới, đất, độ cao, bốc thoát hơi nước / cân bằng nước, thanh trượt nhiệt độ, luồng "chọn cây → chỉ vùng trồng".

**Chiến lược tái cấu trúc: thêm mới, không đập cũ.** `template.html` dài 2.275 dòng; tách nó tốn token và dễ vỡ. Mọi tính năng mới nằm ở **file mới** trong `site/`, đăng ký thêm trang vào mảng `PAGES` và thêm một `<div data-page>`. Code cũ chỉ bị chạm ở điểm nối (menu, thẻ trang chủ) cho đến khi xóa ở Phase 4.

## 2. Kiến trúc đích

```
API mở (POWER, Open-Meteo, MODIS ORNL, SoilGrids, độ cao)   File tải lên (CSV/JSON/GeoJSON)   Nông dân nhập / đánh dấu
            │                                                          │                              │
            └──────────────► site/sources/*  ◄─────────────────────────┴──────────────────────────────┘
                              mỗi nguồn trả về Evidence (giá trị + nguồn + loại + độ phân giải)
                                          │
                              site/core/harmonize.js   → lưới chung của ruộng + bước thời gian tháng
                                          │
                              site/logic/*  (hàm thuần: et0, waterBalance, suitability, rotation, whatIf)
                                          │      mọi kết quả là Evidence loại "derived" hoặc "simulated", giữ danh sách đầu vào
                                          ▼
                              site/pages/*  (bản đồ, biểu đồ, thẻ đèn giao thông) — chỉ in số qua showValue()
                                          │
                              Sổ bằng chứng: chạm vào số → nguồn, công thức, đầu vào
```

Thư mục mới (tên file bên trong do Opus quyết, miễn giữ ranh giới):

```
site/core/      evidence.js (hợp đồng số liệu), harmonize.js (lưới + thời gian), ledger.js (sổ bằng chứng)
site/sources/   power.js, soil.js, elevation.js, ndvi.js, upload.js, farmerInput.js, catalog.js (danh mục nguồn)
site/logic/     et0.js, waterBalance.js, suitability.js, whatIf.js, strategies.js  (+ file cũ)
site/data/      cropLibrary.js (bảng chỉ tiêu cây, có nguồn từng số), precomputed/power_monthly.json
site/pages/     myField.js (Ruộng của tôi), dataHub.js (Dữ liệu)
site/i18n/      fieldText.js (chuỗi VI/EN của các trang mới)
scripts/        probe-apis.mjs, fetch-power-monthly.mjs, check-provenance.mjs, tests/*.test.mjs
samples/        file mẫu THẬT để kéo thả (sinh từ dữ liệu thật đã có trong repo)
```

**Bẫy của build (đọc kỹ):** `build-site.mjs` xóa `import/export` rồi nối mọi module vào **một phạm vi chung**. Vì vậy (a) mọi tên ở cấp cao nhất của module mới phải **duy nhất toàn project** (đặt tiền tố theo module, ví dụ `et0Monthly`, `wbClamp`); (b) `import` vẫn phải đúng để test bằng Node chạy được; (c) thêm file mới vào mảng `modules` theo đúng thứ tự phụ thuộc. Thư viện ngoài (Leaflet) phải được **nhúng thẳng** vào `index.html` trong một thẻ `<script>` thường đặt trước script module; kiểm tra chuỗi `</script>` bên trong thư viện và dùng hàm thay thế (như code hiện tại) để tránh lỗi `$&`.

## 3. Hợp đồng bằng chứng (chống ảo giác bằng cấu trúc)

Mọi con số đi vào logic hoặc ra màn hình là một đối tượng Evidence:

```js
{ value, unit,
  kind,        // 'satellite' | 'model' | 'ground' | 'farmer' | 'reference' | 'derived' | 'simulated' | 'missing'
  source,      // id trong catalog.js (tên, nhà cung cấp, URL, độ phân giải gốc)
  period,      // ví dụ '2001–2024, trung bình tháng 3'
  resolution,  // ví dụ '~0,5° (≈ 55 km)' — độ phân giải GỐC, không phải của lưới ruộng
  fetchedAt, formula, inputs: [Evidence...], note }
```

| `kind` | Nhãn trên màn hình | Ví dụ | Nhóm theo đề |
|---|---|---|---|
| satellite | Vệ tinh đo | MODIS NDVI, file SMAP/GPM tải lên | Observed |
| ground | Đo tại ruộng | pH, độ mặn, chất hữu cơ nông dân nhập | Observed |
| farmer | Nông dân báo | "chỗ này hay ngập" | Observed |
| model | Mô hình ước tính | NASA POWER, SoilGrids | Estimated |
| reference | Tra bảng | FAO-56, FAO Manual 3 | Estimated |
| derived | Tính từ số liệu | ET0, cân bằng nước | theo đầu vào |
| simulated | Mô phỏng giả định | mọi kết quả khi thanh trượt ≠ 0 | Simulated |
| missing | Thiếu dữ liệu / Cần đo thực địa | — | — |

Quy tắc cứng:
1. **Lan truyền:** kết quả tính từ một đầu vào `missing` (bắt buộc) thì là `missing`; từ một đầu vào `simulated` thì là `simulated`. Không có ngoại lệ, không có giá trị mặc định thay thế.
2. **Một cửa ra:** các trang mới chỉ in số qua một hàm (`showValue(ev)`), hàm này luôn gắn nhãn `kind` và mở được dấu vết. `missing` hiển thị lý do và việc cần làm (`đo tại ruộng` / `tải file` / `thử lại`).
3. **Cổng nguồn gốc:** `scripts/check-provenance.mjs` chạy trong `npm test`, thất bại nếu một con số trong `site/data/cropLibrary.js` hoặc `rotationCrops.js` thiếu `src` trỏ tới nguồn có URL, hoặc thiếu trích dẫn nguyên văn (comment/trường `quote`) như cách `rotationCrops.js` đang làm.
4. **Số liệu tra bảng không viết từ trí nhớ.** Muốn thêm một ngưỡng cây trồng: mở nguồn, chép số, ghi URL + trích nguyên văn. Không mở được nguồn thì để `null` và tiêu chí đó hiển thị "Thiếu bảng chỉ tiêu có nguồn".
5. **Tham số do nhóm chọn** (ngưỡng phân loại, tỉ lệ ngày tối thiểu…) gom vào một đối tượng `*_PARAMS` như `ROTATION_PARAMS`, và hiện nguyên văn trên trang với nhãn "ngưỡng do nhóm chọn".

## 4. Logic nông học

Trạng thái: ✅ đã có trong code và có nguồn · 🔎 công thức chuẩn, Opus phải đối chiếu trang nguồn trước khi code (nguồn thắng nếu lệch) · ❓ cần tìm nguồn, không có thì bỏ.

### 4.1 Bốc thoát hơi nước tham chiếu ET0 🔎
FAO-56 Penman–Monteith, phương trình 6, bước tháng (FAO-56 cho phép dùng trung bình tháng):

`ET0 = [0,408·Δ·(Rn − G) + γ·(900/(T+273))·u2·(es − ea)] / [Δ + γ·(1 + 0,34·u2)]`

Đầu vào từ NASA POWER monthly: `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`; độ cao (cho áp suất); vĩ độ và ngày giữa tháng (cho bức xạ ngoài khí quyển). Các bước trung gian (es, ea từ RH trung bình, Δ, γ, Ra, Rso, Rns, Rnl, G tháng) lấy từ chương 3 và 4 của FAO-56:
- Chương 3: https://www.fao.org/4/X0490E/x0490e07.htm
- Chương 4 (có Ví dụ 17, Bangkok tháng 4, dữ liệu trung bình tháng): https://www.fao.org/4/X0490E/x0490e08.htm

**Test bắt buộc:** tái lập Ví dụ 17 với đầu vào và kết quả chép từ chính trang đó, sai số ≤ 0,1 mm/ngày. Ví dụ dùng số giờ nắng; hàm phải nhận được cả giờ nắng lẫn bức xạ đo (POWER cho bức xạ). Đơn vị của từng tham số POWER đọc từ trường mô tả trong chính phản hồi API, không giả định.

### 4.2 Cân bằng nước tháng
- Khí hậu: `P − ET0` từng tháng (mm), kèm p10–p90 giữa các năm. Tháng khô: giữ định nghĩa hiện có `rainMm.mean < ROTATION_PARAMS.dryMonthMm`. ✅
- Theo vụ: giữ cách tính hiện có `nước cần tưới = max(0, nhu cầu vụ − mưa trong vụ)` với nhu cầu vụ từ FAO Manual 3. ✅
- Mưa hữu hiệu ❓: hiện dùng mưa tổng và đã khai là khoảng trống (`gapRainEffective`). Chỉ thay nếu tìm được nguồn gốc trích được cho công thức mưa hữu hiệu.
- Độ ẩm đất dạng "xô nước" [C] 🔎: `S(t+1) = kẹp(S(t) + P − ETc, 0, TAW)`, `TAW = 1000·(θFC − θWP)·Zr` (FAO-56 chương 8, Bảng 19 và 22). Cần loại đất: không có (SoilGrids chết và nông dân chưa nhập) thì kết quả là `missing` với việc cần làm "cho biết loại đất".

### 4.3 Thanh trượt giả định (Phase 3)
- **Mưa ±%:** nhân mưa các tháng trong phạm vi chọn (mùa khô / cả năm), tính lại 4.2.
- **Nhiệt độ +°C:** cộng ΔT vào `T2M_MAX` và `T2M_MIN`, **giữ nguyên áp suất hơi nước thực ea** (giả định ghi rõ trên màn hình), tính lại ET0. Nhu cầu nước của vụ nhân với tỉ số `ET0 mới / ET0 gốc` của các tháng trong vụ (đúng theo mô hình hệ số cây đơn `ETc = Kc·ET0` khi Kc không đổi). Không suy ra thiệt hại năng suất do nóng: chưa có nguồn ngưỡng chịu nhiệt, nói rõ là khoảng trống.
- **Phát lại năm thật:** chọn năm có tổng mưa mùa khô thấp nhất trong chuỗi POWER (tính ra, không gõ cứng), chạy số liệu tháng của đúng năm đó. Nhãn: "Số liệu của năm YYYY (NASA POWER)", không phải "mô phỏng".
- Khi bất kỳ thanh trượt nào ≠ 0: dải băng "Mô phỏng giả định" luôn hiện, mọi số bị ảnh hưởng mang `kind: 'simulated'`, có nút "Về số liệu thật".

### 4.4 Chấm mức phù hợp cây trồng (Luồng 2)
Theo khung đánh giá đất đai của FAO: xếp hạng theo **yếu tố hạn chế nhất**, không cộng điểm có trọng số tự đặt.
- Với mỗi tiêu chí của cây: trong khoảng tối ưu → **Xanh**; ngoài tối ưu nhưng trong khoảng chịu được → **Vàng**; ngoài khoảng chịu được → **Đỏ**; thiếu số liệu ruộng hoặc thiếu ngưỡng có nguồn → **Xám** (không tính).
- Kết quả chung = hạng xấu nhất trong các tiêu chí đã chấm. Nếu số tiêu chí chấm được < một nửa → "Chưa đủ dữ liệu để kết luận" (không bao giờ ra Xanh).
- Tiêu chí: nước (4.2 + câu hỏi "ruộng có chủ động nước tưới không?"), độ dài vụ (`cycleDays` so với cửa sổ vụ) ✅, độ mặn (`salinityEce`, FAO-29) ✅, pH và nhiệt độ ❓ (cần nguồn, ứng viên: cơ sở dữ liệu ECOCROP của FAO; Opus kiểm chứng khả năng truy cập), úng (đánh dấu của nông dân + `wetRootFlag` hiện có).
- Ưu tiên của nông dân chỉ **sắp thứ tự trong cùng một hạng**: "ít nước" → nước cần tưới thấp hơn trước; "cải tạo đất" → `soilPoints` cao hơn trước; "dễ bán" → **không có dữ liệu giá**, hiện là khoảng trống, không dùng để xếp.
- Cây không có trong thư viện: trả lời "chưa có bảng chỉ tiêu có nguồn cho cây này", không đoán.

### 4.5 Ba chiến lược luân canh (Phase 3)
Tập ứng viên hiện có A–D (trùng với thí nghiệm Linh et al.). Ba chiến lược được **chọn bằng tính toán** từ tập ứng viên:
1. **Cơ sở:** kiểu hiện tại của nông dân (mặc định A, cho đổi).
2. **Tiết kiệm nước, chống hạn:** ứng viên có `extraMm` và `dryPenaltyMm` thấp nhất.
3. **Phục hồi đất, ngắt sâu bệnh:** ứng viên có `soilPoints` cao nhất (họ đậu + rễ sâu + cây cạn).
Nếu một ứng viên thắng cả 2 và 3: hiện nó với hai nhãn và lấy ứng viên kế tiếp cho ô còn lại. Năm phần giải trình giữ cấu trúc hiện có; "ngắt chu kỳ sâu bệnh" chỉ nêu ở mức nguồn cho phép, còn lại ghi vào khoảng trống. Cây che phủ cho tháng trống: chỉ thêm nếu có nguồn cho cây cụ thể.

### 4.6 Độ tin cậy
Giữ High/Medium/Low hiện có và hạ bậc thêm khi: tỉ lệ tiêu chí chấm được thấp; hai nguồn cùng biến lệch nhau quá ngưỡng (ngưỡng do nhóm chọn); kết luận ở quy mô ruộng nhưng mọi đầu vào ở quy mô vùng.

## 5. Chuẩn hóa lưới và thời gian

- **Lưới chung:** ô vuông bên trong đa giác ruộng (mặc định 30 m, tự nới để không quá ~400 ô). Chưa vẽ ruộng thì đơn vị phân tích là một điểm.
- **Bước thời gian chung:** tháng. Ngày → tháng: mưa cộng, nhiệt/độ ẩm lấy trung bình; tháng thiếu quá nhiều ngày thì `missing` (ngưỡng do nhóm chọn, hiện trên trang).
- **Không bao giờ nội suy nguồn thô thành chi tiết giả.** Mỗi lớp ghi phương pháp đưa về lưới: `uniform` (một giá trị vùng gán cho mọi ô, **gắn cờ "một giá trị cho cả ruộng"**), `nearest`, `aggregate` (mịn → thô). Lớp `uniform` không được dùng để phân biệt vùng trong ruộng.
- **Thứ thật sự khác nhau trong một thửa:** đánh dấu của nông dân, mẫu đo tại ruộng có vị trí, độ cao (chỉ khi chênh lệch trong ruộng lớn hơn sai số đứng công bố của bộ dữ liệu; ĐBSCL thường không đạt), file tải lên có độ phân giải ≤ kích thước ruộng. Nếu không có gì khác nhau: bản đồ một màu + câu "Vệ tinh không phân biệt được các phần trong thửa ruộng này. Hãy đánh dấu chỗ trũng/chỗ khô hoặc nhập số đo từng góc ruộng."
- **Hai nguồn cùng một biến** (ví dụ mưa POWER và mưa GPM tải lên): hiện cả hai, hiện mức lệch, không âm thầm chọn một.

## 6. Giao diện (nông dân trước tiên)

Thiết kế theo `DESIGN.md` và skill `impeccable` có sẵn trong project; không tạo hệ màu mới ngoài 4 trạng thái bên dưới.

**Quy tắc chung cho các trang mới:** chữ nền ≥ 18 px, nút chạm ≥ 48 px, mỗi màn hình một hành động chính, không menu lồng. Đèn giao thông luôn gồm **màu + biểu tượng + chữ** (Xanh "Nên trồng", Vàng "Cần lưu ý", Đỏ "Không nên", Xám "Thiếu dữ liệu"), dùng chung một bộ token cho bản đồ, biểu đồ và bảng. Mỗi thuật ngữ có nút "Chỉ số này nghĩa là gì?" (mở rộng `glossary.js`). Cuối mỗi khối kết quả có câu nhắc: công cụ để tham khảo, cần kết hợp kinh nghiệm của nông dân và cán bộ khuyến nông. Song ngữ VI/EN đầy đủ.

**Menu sau nâng cấp (4 mục):** Trang chủ · **Ruộng của tôi** (mới, mặc định cho demo) · Luân canh · **Dữ liệu**.

**Trang "Ruộng của tôi"** — ba bước trên một trang, có thanh bước dính trên cùng:
1. *Ruộng ở đâu?* Bản đồ thật. Ba cách chọn bằng nút lớn: chạm vào bản đồ, "Vị trí của tôi", hoặc một trong 5 huyện có sẵn. Tùy chọn: chạm các góc để khoanh thửa, nút "Xong". Hàng nút lớp phủ ảnh NASA (mỗi lúc một lớp): sức khỏe cây (NDVI), mưa, độ ẩm đất, nhiệt bề mặt; có chú giải màu, ngày ảnh, và dòng "Ảnh để nhìn tổng thể; con số cho ruộng nằm ở bảng bên dưới". Nút đánh dấu: "Hay ngập", "Khô nhanh", "Đất phèn/mặn", "Đất tốt".
2. *Mưa nắng và nước.* Một biểu đồ 12 tháng: cột mưa (kèm dải p10–p90), đường ET0, đường nhiệt độ, vùng tô thiếu nước. Đánh dấu ngay trên trục tháng: **tháng ruộng thường trống** và **tháng cây dễ tổn thương** (từ `seasonStrip`, khi có lịch vụ NDVI). Bên dưới: hai thanh trượt (mưa, nhiệt độ) + nút "Năm khô nhất".
3. *Trồng gì?* Ô chọn cây (nút cho các cây trong thư viện + ô gõ tên), ba nút ưu tiên (ít nước / dễ bán / cải tạo đất), câu hỏi nước tưới. Kết quả: thẻ đèn giao thông cho từng cây, câu lý do bằng lời thường nêu yếu tố hạn chế, nút "Vì sao?" mở bảng bằng chứng từng tiêu chí. Khi đã khoanh ruộng: bản đồ tô vùng theo hạng kèm giải thích từng vùng.

**Trang "Luân canh":** giữ; thêm hàng ba thẻ chiến lược (4.5) đặt cạnh nhau, bốn thẻ chi tiết hiện có nằm bên dưới.

**Trang "Dữ liệu":** (a) vùng kéo thả file một bước, sau đó là "hộ chiếu dữ liệu" (số dòng, khoảng ngày, biến nhận ra, đơn vị, số dòng bị loại và lý do) và một nút xác nhận; (b) biểu mẫu số đo đất (pH, độ mặn, chất hữu cơ, loại đất); (c) bảng nguồn với hai cột tách rõ **Vệ tinh / Mô hình** và **Đo tại ruộng / Nông dân báo**, kèm trạng thái từng nguồn (đang có, lấy từ bộ nhớ, thiếu); (d) phần nguồn dữ liệu và công bố dùng AI hiện có.

**Sổ bằng chứng:** chạm vào bất kỳ con số nào → tấm nổi hiện: giá trị, nhãn loại, nguồn (có liên kết), giai đoạn, độ phân giải gốc, công thức và các đầu vào (chạm tiếp được).

## 7. Lộ trình

| Phase | Kết quả thấy được | Phụ thuộc |
|---|---|---|
| 0 | Git, test hồi quy, bảng trạng thái API | — |
| 1 | **Demo:** chọn ruộng trên bản đồ thật → khí hậu + cân bằng nước từ NASA POWER → đèn giao thông cho 3 cây; chạm số ra nguồn | 0 |
| 2 | Trạm dữ liệu: upload + hộ chiếu, đất, độ cao, nông dân đánh dấu, lưới chung, hai nguồn lệch nhau | 1 |
| 3 | Thanh trượt giả định, 3 chiến lược luân canh, thư viện cây có nguồn, bản đồ vùng trồng | 1 (bản đồ vùng cần 2) |
| 4 | Hoàn thiện cho nông dân, trợ lý AI kiểm số, xóa code giả, tài liệu nộp bài | 1–3 |

Thiếu giờ: sau Phase 1 có thể làm ngay nhóm [B] về thanh trượt và 3 chiến lược của Phase 3 (không cần Phase 2), rồi quay lại Phase 2.

## 8. Đối chiếu yêu cầu → nơi thực hiện

| Yêu cầu | Phase | Ghi chú |
|---|---|---|
| Cấm dữ liệu giả gắn mác NASA | 1, 4 | Ẩn rồi xóa 4 thửa mô phỏng |
| Thiếu dữ liệu → "Cần đo thực địa" | 1 | `kind: 'missing'` + lan truyền |
| Truy xuất ngược mọi kết luận | 1 | Sổ bằng chứng |
| NASA POWER thời gian thực (nhiệt, mưa, bức xạ, độ ẩm) | 1 | Tọa độ bất kỳ |
| Độ cao, thổ nhưỡng | 2 | Theo kết quả dò API ở Phase 0 |
| Upload CSV/JSON/GeoJSON (SMAP, ECOSTRESS, GPM, Landsat/MODIS, GRACE-FO, xét nghiệm đất) | 2 | |
| Chuẩn hóa lưới; tách nhãn Vệ tinh / Đo tại ruộng | 2 | Mục 5 |
| Chọn vị trí / khoanh thửa trên bản đồ | 1 ([N] khoanh), 2 | |
| Lớp bản đồ: nhiệt, mưa, độ ẩm đất, NDVI | 1 | Ảnh NASA GIBS |
| Lớp nguy cơ xói mòn / sương giá / ngập úng | 3 | Chỉ nơi dữ liệu cho phép; sương giá tính từ `T2M_MIN` |
| Biểu đồ mưa, nhiệt, ET, cân bằng nước | 1 | |
| Đánh dấu tháng trống và tháng dễ tổn thương | 1 | Tái dùng `seasonStrip` |
| Thanh trượt mưa −20% / nhiệt +2 °C | 3 | Mục 4.3 |
| Cây nên / không nên trồng kèm lý do | 1 (3 cây), 3 (mở rộng) | |
| ≥ 3 chiến lược luân canh, gồm kiểu hiện tại | đã có, 3 | Mục 4.5 |
| 5 phần giải trình cho từng chiến lược | đã có | Giữ |
| Luồng 2: nhập cây → bản đồ vùng trồng | 1 (mức cả ruộng), 3 (mức vùng) | |
| Chữ to, nút lớn, đèn giao thông | 1, 4 | |
| Dịch thuật ngữ + "Chỉ số này nghĩa là gì?" | 1, 4 | |
| Câu nhắc tham khảo, kết hợp khuyến nông | 1 | |

## 9. Rủi ro đã biết

- **Mạng tại nơi thi:** mọi thứ trong demo phải có đường lui ngoại tuyến cho 5 huyện (dữ liệu tính sẵn + cache). Ảnh nền bản đồ không tải được thì vẫn chọn huyện bằng nút.
- **SoilGrids:** trang ISRIC ghi dịch vụ REST đang tạm dừng; không coi là nguồn chắc chắn.
- **Độ cao Open-Meteo** là Copernicus GLO-90, không phải SRTM: ghi đúng tên nhà cung cấp.
- **SMAP, ECOSTRESS, GPM, GRACE-FO:** không có đường lấy trực tiếp không cần tài khoản đã được kiểm chứng; đi qua cổng upload.
- **Ảnh GIBS chỉ để nhìn:** không đọc số từ màu ảnh.
- **Tên sản phẩm:** không ngụ ý là sản phẩm chính thức của NASA (đã xử lý, giữ nguyên).
