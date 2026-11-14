---
name: Mekong
description: A calm, field-centered workspace for understanding land conditions and weighing crop rotations in the Mekong Delta.
colors:
  ground: '#f7f8f2'
  line: '#dfe5d9'
  ink: '#192d22'
  muted: '#627063'
  primary: '#254f35'
  accent: '#628d39'
  pale-green: '#eff2e7'
  action-highlight: '#d1e8a6'
typography:
  family: Be Vietnam Pro
  displayWeight: 600
  bodyWeight: 400
---

# Mekong — giao diện hiện hành

Cập nhật 14/11/2026 theo yêu cầu làm lại giao diện. Tài liệu này thay thế mô tả giao diện NEOFARM và dashboard bốn thửa minh họa trước đây.

## Hướng thiết kế

Nền kem nhẹ, xanh lá đậm, khoảng trắng rộng và chữ rõ. Trang chủ có hai cột: lời giới thiệu bên trái, ảnh đồng ruộng bên phải với hai góc bo lớn. Một thẻ dữ liệu vệ tinh nhỏ làm điểm nhấn; không trình bày ảnh minh họa như bản đồ hay dữ liệu của một vườn thật.

Nội dung theo thứ tự: giới thiệu → cơ sở dữ liệu → ba công cụ → cách sử dụng → mở bản đồ → chân trang. Các công cụ nằm ở trang riêng trong cùng một file HTML, dùng bộ định tuyến hash hiện có.

## Thành phần

- Menu cao 72 px, nền sáng xuyên suốt, trạng thái trang và ngôn ngữ rõ ràng; menu thu gọn ở màn hình hẹp.
- Nút chính xanh đậm, góc bo 9 px. Nút phụ là liên kết có mũi tên. Hình viên thuốc dành cho các lựa chọn nhỏ của công cụ hiện có.
- Thẻ công cụ bo 14 px, viền mảnh; thẻ Vườn của tôi dùng nền xanh đậm để chỉ lối vào chính.
- Tiêu đề trang chủ khoảng 44–67 px; điện thoại khoảng 39–54 px. Giữ dấu tiếng Việt đủ khoảng cách dòng.
- Trang chủ tối đa 1.280 px, đệm ngang 48 / 32 / 22 px theo độ rộng màn hình.
- Font Be Vietnam Pro được nhúng trong HTML; không thêm font ngoài.
- Chuyển động nhẹ khi xuất hiện và rê chuột; tắt với `prefers-reduced-motion`.

## Bản đồ và trang công cụ

Giữ nguyên sơ đồ bản đồ + panel trái 380 px ở desktop từ 1.024 px. Màn hình nhỏ hơn dùng bảng thông tin dưới cùng có ba chiều cao. Đồng bộ chiều cao khi mở trang hoặc thay đổi kích thước; không dùng mốc 640 px cho logic panel khi CSS dùng mốc 1.024 px.

Bản đồ dùng nền vệ tinh thật cùng các lớp, công cụ vẽ, nhiều vườn và giải thích bằng chứng hiện có. Thanh tìm kiếm, tab và thẻ thông tin dùng cùng góc bo, màu và nét chữ với giao diện mới. Luân canh và Dữ liệu dùng tiêu đề gọn, thẻ viền mảnh và khoảng cách rõ.

## Nội dung và dữ liệu

Nội dung mới ở `site/i18n/redesignText.js`, đầy đủ VI/EN. Kiểm tra ngôn ngữ gồm cả các phần tử mảng (thẻ công cụ và các bước). Số liệu trang chủ giữ từ dữ liệu dự án: 2 nguồn NASA, 5 huyện, 25 năm khí hậu. Không thêm khuyến nghị nông học hay ngưỡng mới để phục vụ thiết kế.

Trong tab bản đồ phù hợp cây: dùng ID cây của thư viện hiện hành và lịch mùa vụ từ cùng phép tính với trang Luân canh. Thiếu lịch vụ thì giữ kết quả xám, không tự tạo lịch cố định. Chưa biết tưới, pH hoặc độ mặn thì giữ thiếu thông tin.

## Mã nguồn và ảnh

- `site/template.html`: kết cấu trang và các hàm hiển thị.
- `site/styles.css`: nền tảng màu, font và các thành phần cũ được giữ lại.
- `site/redesign.css`: lớp giao diện mới, được build ghép sau CSS nền.
- `site/assets/mekong-fields.jpg`: ảnh Joel Vodell / Unsplash, kế thừa từ ảnh trang chủ cũ; nguồn và giới hạn trong README cạnh ảnh.
- `scripts/build-site.mjs`: nhúng font, ảnh, icon, Leaflet, dữ liệu và logic vào `index.html`. Không chỉnh tay file sinh ra.

Ảnh trang chủ được nhúng để không mất ảnh khi ngoại tuyến. Bản đồ nền và dữ liệu trực tiếp vẫn cần mạng; đường lui và giới hạn dữ liệu hiện có được giữ.

## Kiểm tra hoàn thiện

Kiểm tra bản build, 114 kiểm tra hồi quy, cổng nguồn gốc và đủ hai ngôn ngữ. Trình duyệt Chrome thực tế kiểm tra các trang, tab bản đồ, chọn huyện, menu điện thoại và chuyển ngôn ngữ; kiểm tra tràn ngang trên desktop và điện thoại. Ảnh kiểm tra và hồ sơ trình duyệt nằm trong `.preview/`, không đưa vào nguồn phiên bản.

## Nhóm vườn và vườn con (14/11/2026)

Tab Vườn của tôi mở đầu bằng một trạng thái rỗng, không có vườn minh họa. Người dùng tạo nhóm bằng tên + màu. Header nhóm có biểu tượng thư mục, tên nhóm, dấu + để thêm vườn con và nút cài đặt nhóm để đổi tên/màu. Vườn con mới có hồ sơ trống; bánh răng mở hộp cài đặt độc lập, có đổi tên và xóa (xác nhận trước khi xóa).

Hai nút Nhóm vườn/Vườn riêng chỉ mở danh sách lựa chọn khi nhấn. Bản đồ chỉ hiện các vườn trong lựa chọn; viền dùng màu cha, bên trong dùng màu đánh giá. Chưa chọn cây là xám. Chọn cây + thông tin riêng thì đánh giá theo mô hình có nguồn hiện hành; thiếu dữ liệu tiếp tục xám. Màu nhóm không được dùng thay màu phù hợp của cây.

`site/gardens.css` được ghép sau CSS chung. Cài đặt dùng dialog gốc của trình duyệt để giữ focus bàn phím; header/footer cố định, nội dung cuộn riêng. Thiết bị nhỏ có ô nhập 16 px, nút cài đặt tối thiểu 40 px. Nội dung VI/EN nằm ở gardenText.js. Dữ liệu nhóm/vườn và lựa chọn xem nằm trong snapshot; chỉ số mang gardenId, không trộn vườn dù cùng tọa độ. Chi tiết mô hình và kiểm tra ở gardenModel.js và gardens.test.mjs.

## Tính lại màu vùng sau khi lưu

Cài đặt hiện hành của vườn là đầu vào chính cho cây, vụ/tháng gieo, tưới và chỉ số đất. pH/EC đã đặt ở đây dùng cho cả vườn và được ưu tiên trên số đo lịch sử. Chỉ tiêu còn thiếu có thể lấy từ điểm đo môi trường gắn đúng gardenId, tạo vùng cục bộ có căn cứ. Số đo cả vườn nhập ở Trạm dữ liệu cũng cập nhật hồ sơ hiện hành. Dữ liệu chưa xác định quyền sở hữu không được gán theo bán kính 1 km cho các vườn lân cận.

Mỗi vườn giữ bộ môi trường nhất quán theo tài khoản, gardenId và tọa độ. Lưu settings không làm tải lại hay hoán đổi nguồn môi trường. Nếu đang chờ tải, phản hồi đến sẽ đánh giá với hồ sơ mới nhất. Bộ nhớ POWER v2 theo tọa độ chính xác đến 6 chữ số thập phân; cache v1 chỉ được nhận nếu chính tọa độ bản ghi khớp.

Map, danh sách và thẻ chi tiết dùng cùng snapshot kết quả có khóa đầu vào. Chỉ khi đầu vào thực đổi mới tính lại. Với zone cục bộ, không có lớp màu tổng bên dưới để tránh pha màu ngoài bốn trạng thái. Mục “Căn cứ màu vùng” nêu các tiêu chí và số liệu/bằng chứng đang dùng. Hữu cơ, loại đất và ghi chú vẫn lưu lại nhưng hiện chưa dùng đổi màu; thông tin này hiển thị ngay trong cài đặt.
