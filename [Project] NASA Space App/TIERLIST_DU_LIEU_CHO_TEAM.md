# Tier list dữ liệu cho web nông nghiệp Đồng bằng sông Cửu Long

**Đề xuất bắt đầu: NASA POWER cho nhiệt độ và điều kiện thời tiết trong quá khứ, GPM IMERG cho mưa. Sau đó mới thêm SMAP hoặc một nguồn ảnh cây xanh.** Để đưa ra phương án luân canh, team còn cần lịch canh tác, yêu cầu của cây, thông tin đất và nguồn nước tại địa phương.

Tài liệu dành cho team không chuyên dữ liệu. Xếp hạng theo mức phù hợp với bản thi local hiện tại: một vùng thí điểm ở ĐBSCL, một hệ cây ngắn ngày, so sánh hiện trạng với hai phương án luân canh. Đây là đánh giá ưu tiên cho dự án, không phải xếp hạng chất lượng khoa học của các nguồn.

Nguồn đầu vào: [Data Information.md](./Data%20Information.md), [Data.md](./Data.md) và [Challenge.md](./Challenge.md). Đối chiếu tài liệu chính thức ngày **14/11/2026**. Chưa tải và kiểm tra dữ liệu thực tế cho một mảnh đất cụ thể.

## 1. Hiểu đúng danh sách BTC đưa

- File BTC là **danh sách nơi có thể lấy dữ liệu**, chưa phải một bộ số liệu đã chuẩn bị sẵn cho web.
- Trong đó có NASA, USDA, USGS, FAO, ESA và các đơn vị khác. Không nên ghi tất cả là dữ liệu do NASA tạo ra.
- Một số nguồn có toàn cầu, một số phục vụ Hoa Kỳ hoặc khu vực khác. Có tên trong đề không có nghĩa có số liệu cho ĐBSCL.
- Một nguồn có thể chứa nhiều loại dữ liệu. Team cần chọn đúng loại phục vụ tính năng, không tải tất cả.
- Để khỏi nhầm, tài liệu tách Landsat, MODIS, VIIRS và tách NLDAS với GLDAS. Tổng cộng có **27 mục để quyết định**; không có nghĩa BTC cấp 27 bộ dữ liệu đã dùng được ngay.

## 2. Cách đọc hạng và độ khó

| Hạng | Nghĩa đối với team | Hành động |
| --- | --- | --- |
| **S** | Hữu ích trực tiếp, đáng dành công sức đầu tiên. | Thử lấy một vùng nhỏ và đưa vào luồng chính. |
| **A** | Rất có ích, nhưng cần chọn theo tính năng và nguồn lực. | Thêm sau hai nguồn S; không bắt buộc lấy hết. |
| **B** | Hữu ích nếu có câu hỏi rõ hoặc người hỗ trợ xử lý. | Dùng khi nguồn đang có chưa giải quyết được việc cần làm. |
| **C** | Ít ưu tiên cho bản thi này, hoặc chỉ nên dùng để tham khảo. | Tạm để sau; chỉ mở khi có lý do cụ thể. |
| **X** | Không có lớp/trạm phù hợp ĐBSCL trong sản phẩm được giới thiệu. | Không dành thời gian tìm số liệu trực tiếp cho vùng dự án từ nguồn này. |

**Độ khó:** ★☆☆☆☆ dễ → ★★★★★ rất khó. Tính cho việc lấy, hiểu và đưa một phần dữ liệu vào web, không chỉ tải được file. Đây là ước lượng cho người mới; chưa phải thời gian thực hiện đã đo. Hạng X không chấm độ khó vì vấn đề chính là sai vùng.

**Một câu để nhớ:** hạng S nên thử trước; hạng A chọn lọc; hạng X bỏ khỏi danh sách tích hợp ĐBSCL.

## 3. Bảng tổng hợp đủ 27 nguồn

| Hạng | Nguồn BTC giới thiệu | Hiểu đơn giản | Quyết định cho bản thi |
| --- | --- | --- | --- |
| **S** | **NASA POWER** | Sổ thời tiết của một vùng: nhiệt độ, mưa và các điều kiện liên quan. | Nguồn dễ bắt đầu để làm bảng và biểu đồ theo thời gian. |
| **S** | **GPM IMERG** | Bản đồ lượng mưa và số liệu mưa theo thời kỳ. | Làm lớp mưa và kiểm tra các giai đoạn ít/nhiều mưa. |
| **A** | **SMAP** | Ước tính đất của một vùng đang khô hay ẩm. | Thêm lớp độ ẩm đất và bối cảnh thiếu nước. |
| **A** | **GAEZ** | Tham khảo cây nào phù hợp với điều kiện tự nhiên của vùng. | Hỗ trợ sàng lọc cây; không tự tạo được toàn bộ lịch luân canh. |
| **A** | **Sentinel 2** | Ảnh giúp nhìn biến động cây xanh khá chi tiết. | Chọn để làm phần nhìn cây xanh hoặc đất trống nếu team xử lý được ảnh. |
| **A** | **Landsat** | Ảnh đất và cây trồng qua nhiều năm. | Lựa chọn thay thế/bổ sung Sentinel 2, nhất là cần nhìn lịch sử dài. |
| **B** | **ECOSTRESS** | Nhiệt trên bề mặt và ước tính nước mất qua đất, cây. | Phần mở rộng về nóng và nhu cầu nước; chưa nên là việc đầu tiên. |
| **B** | **MODIS** | Quan sát cây xanh và điều kiện mặt đất trên vùng rộng. | Hữu ích cho xu hướng nhiều năm, ít chi tiết cho mảnh đất nhỏ. |
| **B** | **ERA5** | Bức tranh thời tiết quá khứ được tổng hợp từ nhiều nguồn. | Chọn khi cần biến hoặc thời gian mà cách dùng POWER hiện tại chưa đáp ứng. |
| **B** | **GLDAS** | Ước tính nước và độ ẩm đất cho những vùng lớn. | Nguồn bổ sung về nước; cần người hiểu cách chọn dữ liệu. |
| **C** | **SRTM** | Bản đồ độ cao địa hình. | Tham khảo cao/thấp; chưa đủ để kết luận từng vườn có ngập hay không. |
| **C** | **VIIRS** | Một nhóm quan sát vệ tinh, trong đó có sản phẩm về cây xanh. | Chưa cần thêm nếu đã chọn nguồn cây xanh khác. |
| **C** | **GEDI** | Đo cấu trúc và độ cao cây, trọng tâm là rừng. | Ít liên quan tới luân canh cây ngắn ngày. |
| **C** | **USDA Ag Data Commons** | Thư viện nhiều bộ dữ liệu nghiên cứu nông nghiệp. | Tìm tài liệu hoặc dữ liệu phù hợp; không phải bản đồ ĐBSCL có sẵn. |
| **C** | **USDA AMS Market News** | Tin và báo cáo thị trường nông sản, có cả nội dung quốc tế. | Tham khảo thị trường; chưa phải giá tại ruộng ở Việt Nam. |
| **X** | **Web Soil Survey** | Cổng xem bản đồ đất của USDA. | Không dùng làm bản đồ đất ĐBSCL. |
| **X** | **SSURGO / STATSGO2** | Các bộ số liệu đất phía sau nhiều công cụ đất của USDA. | Không có lớp ĐBSCL để lấy trực tiếp. |
| **X** | **CDL / CropScape** | Bản đồ phân loại cây trồng tại Hoa Kỳ. | Không dùng để biết ruộng ĐBSCL đang trồng cây gì. |
| **X** | **PRISM** | Dữ liệu khí hậu cho khu vực được chương trình hỗ trợ. | Không có lớp Việt Nam phù hợp cho dự án này. |
| **X** | **NAIP** | Ảnh chụp từ máy bay cho Hoa Kỳ. | Không phải ảnh vườn ở ĐBSCL. |
| **X** | **NLCD** | Bản đồ đất đang được dùng làm gì tại Hoa Kỳ. | Không có lớp ĐBSCL trong sản phẩm này. |
| **X** | **NLDAS** | Ước tính nước và thời tiết cho một phần Bắc Mỹ. | Không dùng cho ĐBSCL; khác với GLDAS. |
| **X** | **CoCoRaHS** | Mạng người dân đo mưa ở các nước/khu vực tham gia. | Không có mạng quan trắc ĐBSCL để dùng cho dự án. |
| **X** | **USGS NWIS** | Dữ liệu từ hệ thống trạm nước USGS. | Không phải mạng trạm sông, mặn của ĐBSCL. |
| **X** | **USDA NASS QuickStats** | Thống kê nông nghiệp theo vùng hành chính Hoa Kỳ. | Không dùng làm năng suất hoặc diện tích cây trồng Việt Nam. |
| **X** | **OpenET** | Ước tính nước mất qua đất và cây ở vùng được hỗ trợ. | Nền tảng dữ liệu công khai đang giới thiệu phủ 48 bang liền kề Hoa Kỳ; chưa phải lớp ĐBSCL. |
| **X** | **LANDFIRE** | Bản đồ thảm thực vật và vật liệu dễ cháy ở các vùng Hoa Kỳ được hỗ trợ. | Không có lớp ĐBSCL trong sản phẩm được giới thiệu. |

**Nên chọn một trong Sentinel 2 và Landsat cho lần tích hợp ảnh đầu tiên.** Không cần ôm cả hai, MODIS và VIIRS để cùng làm một việc xem cây xanh.

## 4. Hạng S nên bắt đầu như thế nào

### S1 NASA POWER

**Ví dụ dễ hình dung:** chọn một vị trí, xem nhiệt độ trung bình các tháng trong những năm trước, rồi dùng thông tin này khi so sánh lịch canh tác.

| Team cần biết | Giải thích và cách làm |
| --- | --- |
| Lấy được gì | Nhiệt độ và nhiều điều kiện thời tiết; có thể lấy theo ngày hoặc tháng tùy biến. |
| Đưa vào đâu trên web | Hồ sơ điều kiện vùng, biểu đồ theo tháng, thông tin giải thích tại sao một mùa cần chú ý. |
| Cần chuẩn bị | Vị trí vùng thí điểm; khoảng thời gian; danh sách vài thông tin thật sự cần lấy. |
| Cách bắt đầu | Mở công cụ xem dữ liệu POWER → chọn điểm → chọn thời gian và thông tin → tải bảng số → kiểm tra → lưu bản dùng cho demo. |
| Người làm code cần làm gì | Đọc bảng số; tính theo kỳ cần dùng; đưa giá trị vào bản đồ/biểu đồ và bộ so sánh. Sau đó mới thêm cách lấy tự động. |
| Có cần AI không | Không. Phần lấy số và vẽ biểu đồ dùng code thông thường. AI chỉ giải thích kết quả sau đó nếu cần. |
| Độ khó | **★★☆☆☆** cho một điểm và vài biến; bản đồ cả vùng cần thêm xử lý. |

**Chú ý:** nhiều thông tin thời tiết gốc đại diện một vùng khá lớn, không phải một trạm đặt trong vườn. POWER hiện cũng có đường lấy một số dữ liệu chi tiết hơn từ IMERG và SMAP; cần kiểm tra đúng loại. Lấy mưa IMERG qua POWER rồi lấy lại từ IMERG không tạo ra hai bằng chứng độc lập. [Nguồn phương pháp POWER](https://power.larc.nasa.gov/docs/methodology/).

### S2 GPM IMERG

**Ví dụ dễ hình dung:** bản đồ cho thấy tổng mưa trong một tháng; nhấn vào vùng đất để xem mưa của vùng đại diện cho vị trí đó.

| Team cần biết | Giải thích và cách làm |
| --- | --- |
| Lấy được gì | Ước tính mưa theo khu vực và thời gian. Có bản phục vụ cập nhật nhanh và bản xử lý kỹ hơn cho nghiên cứu quá khứ. |
| Đưa vào đâu trên web | Lớp Lượng mưa, biểu đồ theo tháng, lý do liên quan tới những giai đoạn ít/nhiều mưa. |
| Cần chuẩn bị | Một vùng nhỏ, kỳ thời gian và mục đích: xem lịch sử hay theo dõi gần hiện tại. |
| Cách bắt đầu | Dùng công cụ xem/phân tích được NASA giới thiệu, như Giovanni, để chọn vùng và thời kỳ; lấy bảng số hoặc lớp bản đồ. Một số cách tải yêu cầu tài khoản miễn phí. |
| Người làm code cần làm gì | Đọc giá trị mưa, cộng đúng theo kỳ, tô màu theo lượng mưa và lưu nguồn/ngày. Không chỉ dùng một ảnh chụp màn hình để tính. |
| Có cần AI không | Không. Mưa được tính từ dữ liệu; AI không tự tạo số liệu hoặc tự đoán mức mưa. |
| Độ khó | **★★★☆☆** cho một lớp mưa có giá trị số và nguồn rõ. |

**Chú ý:** một ô dữ liệu khoảng 10 km có thể chứa nhiều vườn. Mưa ít chưa đủ để kết luận ruộng thiếu nước nếu có tưới; mưa nhiều chưa đủ xác nhận ngập hoặc bệnh. [Nguồn NASA IMERG](https://gpm.nasa.gov/data/imerg).

## 5. Hạng A chọn thêm theo nhu cầu

| Nguồn | Tính năng cụ thể | Cần chuẩn bị gì và dùng thế nào | Giới hạn cần nhớ | Độ khó |
| --- | --- | --- | --- | --- |
| **SMAP** | Lớp Độ ẩm đất; xem vùng đang khô hơn hoặc ẩm hơn qua thời gian. | Chọn loại số liệu phù hợp, vùng và thời kỳ → lấy phần độ ẩm → kiểm tra chỗ có nước mặt/số liệu kém → đưa vào biểu đồ và phần giải thích về nước. | Nhiều sản phẩm đại diện vùng rộng hàng km. Độ ẩm không phải độ phì, pH hoặc độ mặn; không cho ngay lượng nước cần tưới cho từng cây. | **★★★☆☆** |
| **GAEZ** | Danh sách cây có thể phù hợp về điều kiện tự nhiên; tham khảo khi thiết kế hai chiến lược thay thế. | Chọn đúng cây, vùng, điều kiện có tưới hay dựa vào mưa và mức chăm sóc → lấy phần đánh giá phù hợp → nhờ chuyên môn địa phương rà soát. | Không phải kế hoạch canh tác hoàn chỉnh; không bảo đảm năng suất thực tế, thị trường hay lợi nhuận. Phiên bản 5 có từ 2025; không mặc định link v4 trong danh sách là mới nhất. | **★★★☆☆** |
| **Sentinel 2** | Lớp Biến động cây xanh hoặc thời kỳ đất trống. | Chọn vài ảnh cùng khu vực, khác ngày, ít mây → loại phần bị mây che → so sánh mức cây xanh → lưu ảnh bản đồ và giá trị cần dùng. | Không thấy xuyên mây; ít xanh có nhiều nguyên nhân. Không gọi đó là bệnh hoặc thiếu phân khi chưa xác minh. | **★★★★☆** |
| **Landsat** | Xem đất/cây thay đổi qua nhiều năm; lớp cây xanh và lịch sử vùng. | Chọn ảnh đã được cơ quan cung cấp xử lý sẵn → chọn ngày/vùng ít mây → so sánh theo thời gian → đưa kết quả vào phần lịch sử. | Cần chọn đúng loại ảnh. Ảnh màu thông dụng khoảng 30 m không có nghĩa mọi loại nhiệt độ hoặc kết quả khác đều có độ chi tiết thật tương tự. | **★★★★☆** |

Nguồn: [SMAP](https://nsidc.org/data/smap/data), [GAEZ của FAO và IIASA](https://www.fao.org/gaez/en), [Sentinel 2](https://developers.google.com/earth-engine/datasets/catalog/sentinel-2/), [Landsat đã xử lý sẵn](https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products).

**Team nên chọn thế nào:** muốn tăng căn cứ về nước, thử SMAP; muốn thêm căn cứ lựa chọn cây, xem GAEZ; muốn demo biến động cây xanh rõ hơn, chọn Sentinel 2 hoặc Landsat. Ảnh đẹp chỉ đáng thêm khi giúp trả lời một câu hỏi của người dùng.

GAEZ là dữ liệu tham khảo của FAO/IIASA, Sentinel 2 thuộc chương trình Copernicus/ESA. Có thể dùng cùng dữ liệu NASA, nhưng phải ghi đúng nguồn.

## 6. Hạng B có ích nhưng chưa cần ôm ngay

| Nguồn | Có thể làm gì trên web | Cần gì và cách dùng đơn giản | Vì sao chưa ưu tiên | Độ khó |
| --- | --- | --- | --- | --- |
| **ECOSTRESS** | Lớp bề mặt nóng và ước tính nước mất qua đất/cây ở thời điểm có dữ liệu. | Tìm lần quan sát phù hợp vùng và thời gian → kiểm tra chất lượng, mây và giờ chụp → dùng phần số liệu đã kiểm tra. | Nhiệt độ bề mặt khác nhiệt độ không khí. Chưa thể biến thành lịch tưới chính xác chỉ từ một ảnh. Cần chọn đúng sản phẩm. | **★★★★☆** |
| **MODIS** | Đường biến động cây xanh qua nhiều mùa trên vùng rộng. | Chọn sản phẩm cây xanh đã xử lý sẵn → lấy một vùng qua nhiều thời kỳ → vẽ xu hướng. | Nhiều vườn nhỏ có thể chung một ô; trùng phần việc đã giao cho Sentinel 2/Landsat nếu chỉ cần một lớp cây xanh. | **★★★☆☆** |
| **ERA5** | Biểu đồ thời tiết quá khứ theo giờ/ngày và các biến bổ sung. | Chọn vài thông tin cần thiết, vùng và thời gian → tải phần nhỏ → tổng hợp ra tháng/vụ. | Cách lấy và file có thể khó hơn POWER với team mới. Đây là thông tin quá khứ được tổng hợp, không tự là dự báo tháng tới. | **★★★★☆** |
| **GLDAS** | Bối cảnh độ ẩm và tình hình nước của vùng lớn. | Chọn đúng loại độ ẩm và lớp đất → lấy vùng nhỏ → so theo mùa → hiển thị là ước tính của vùng. | Trùng một phần với SMAP và nguồn khí tượng; cần hiểu loại số liệu trước khi đưa vào phép so sánh. | **★★★★☆** |

Nguồn: [ECOSTRESS](https://ecostress.jpl.nasa.gov/data/), [MODIS](https://modis.gsfc.nasa.gov/data/), [ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview), [GLDAS](https://ldas.gsfc.nasa.gov/gldas).

**Chọn vì cần một thông tin cụ thể, không chọn vì có nhiều lớp trên bản đồ.** ERA5 do ECMWF cung cấp, không phải sản phẩm NASA.

## 7. Hạng C nên để sau hoặc chỉ tham khảo

| Nguồn | Dữ liệu nói về gì | Nếu dùng thì làm gì và cần gì | Lý do để sau | Độ khó khi dùng nghiêm túc |
| --- | --- | --- | --- | --- |
| **SRTM** | Độ cao địa hình. | Lấy lớp độ cao vùng nhỏ để xem địa hình tổng quát; muốn đánh giá ngập phải có thêm nước, mưa, đê/cống, thoát nước và kiểm chứng. | ĐBSCL tương đối bằng phẳng; sai khác nhỏ về độ cao có thể quan trọng. Chiều cao cây/công trình và sai số ảnh hưởng kết luận. Không tô vùng ngập chỉ bằng nơi thấp. | **★★★☆☆** để đưa lớp độ cao vào; đánh giá ngập đáng tin cậy khó hơn nhiều. |
| **VIIRS** | Có nhiều sản phẩm, gồm quan sát cây xanh và các chủ đề khác. | Chọn rõ sản phẩm cây xanh hoặc một việc khác thật sự cần; kiểm tra có phủ vùng và độ chi tiết phù hợp rồi mới lấy. | Không phải một bộ dữ liệu duy nhất. Chưa cần thêm một nguồn cây xanh nếu đã có nguồn phù hợp. | **★★★☆☆** |
| **GEDI** | Độ cao và cấu trúc cây, trọng tâm rừng; nhiều dữ liệu là các điểm đo. | Chỉ xem xét nếu đổi bài toán sang rừng, cây lâu năm hoặc cấu trúc tán cây và có người hiểu cách xử lý. | Ít phù hợp luân canh cây ngắn ngày; không phải lớp chất lượng đất và không phủ kín mọi thửa. | **★★★★★** |
| **USDA Ag Data Commons** | Kho dữ liệu từ nhiều nghiên cứu nông nghiệp. | Tìm đúng cây hoặc chủ đề → đọc nghiên cứu thu ở đâu, bằng cách nào → chỉ dùng phần có thể áp dụng và được phép sử dụng. | Phải tự tuyển chọn; kho này không cấp sẵn dữ liệu đất và lịch vụ chuẩn cho ĐBSCL. | **★★★☆☆** để tìm và đánh giá một bộ phù hợp. |
| **USDA AMS Market News** | Báo cáo thị trường nông sản, có nội dung trong và ngoài Hoa Kỳ. | Nếu muốn bổ sung thị trường, tìm báo cáo đúng mặt hàng/quốc gia → kiểm tra ngày, loại giá và nơi giao dịch → dùng như tham khảo. | Giá nhập khẩu, bán buôn hoặc quốc tế không phải giá nông dân Việt Nam nhận tại ruộng. Không đủ để tính lợi nhuận luân canh. | **★★★☆☆** để dùng đúng một chuỗi giá. |

Nguồn: [SRTM và ảnh hưởng bề mặt tới độ cao](https://www.usgs.gov/special-topics/significant-topographic-changes-in-the-united-states/science/accuracy-assessment), [VIIRS](https://www.earthdata.nasa.gov/data/instruments/viirs), [GEDI](https://gedi.umd.edu/data/), [Ag Data Commons](https://www.nal.usda.gov/services/agdatacommons), [USDA về phạm vi Market News](https://www.usda.gov/sites/default/files/documents/23-2026-CJ-AMS.pdf).

## 8. Hạng X không dành công tích hợp trực tiếp cho ĐBSCL

Hạng X không có nghĩa dữ liệu kém. Các nguồn này phục vụ vùng khác, nên không giải quyết trực tiếp nhu cầu số liệu tại đất của nông dân ĐBSCL. Có thể học cách trình bày hoặc phương pháp của họ; không lấy số nơi khác gán sang Việt Nam.

| Nguồn | Nếu ở đúng vùng thì làm được gì | Vì sao không dùng trực tiếp cho web này | Team cần tìm thay thế |
| --- | --- | --- | --- |
| **Web Soil Survey** | Xem đặc tính và mức phù hợp của đất. | Cổng đất của USDA, không có lớp ĐBSCL cần cho dự án. | Mẫu đất địa phương hoặc nguồn đất toàn cầu có phủ Việt Nam. |
| **SSURGO / STATSGO2** | Lấy số liệu và bản đồ đất. | Các bộ đất liên quan tới hệ thống USDA; không có lớp ĐBSCL. Web Soil Survey còn là một cách xem các dữ liệu này, không phải nguồn độc lập để kiểm chứng lẫn nhau. | Như dòng trên. |
| **CDL / CropScape** | Nhìn cây trồng theo khu vực qua từng năm. | Sản phẩm cây trồng tại Hoa Kỳ, không nói ruộng Việt Nam đang trồng gì. | Nông dân nhập lịch hiện trạng; bản đồ cây trồng địa phương nếu có. |
| **PRISM** | Xem mưa, nhiệt và khí hậu tại vùng được hỗ trợ. | Không có lớp Việt Nam phù hợp. Chương trình có cả các khu vực ngoài phần Hoa Kỳ liền kề, nhưng điều đó không tạo vùng phủ ĐBSCL. | POWER, IMERG hoặc nguồn Việt Nam. |
| **NAIP** | Ảnh rất chi tiết để nhìn mặt đất. | Ảnh chụp từ máy bay cho vùng Hoa Kỳ được chương trình hỗ trợ, không phải ảnh ĐBSCL. | Sentinel 2/Landsat cho phạm vi phù hợp; ảnh địa phương nếu có quyền dùng. |
| **NLCD** | Biết khu nào là cây, nước, đô thị và các loại sử dụng đất. | Sản phẩm giới thiệu không có lớp ĐBSCL. | Nguồn sử dụng đất toàn cầu/Việt Nam hoặc phạm vi do team xác minh. |
| **NLDAS** | Ước tính nước, độ ẩm và thời tiết của vùng được hỗ trợ. | Phủ một phần Bắc Mỹ; không phủ ĐBSCL. | GLDAS hoặc SMAP nếu cần, không nhầm vì tên gần giống. |
| **CoCoRaHS** | Đối chiếu số mưa vệ tinh với người đo ở mặt đất. | Không có mạng trạm ĐBSCL cho việc đối chiếu của team. Mạng hiện có các nước và lãnh thổ tham gia, không chỉ một nước. | Trạm khí tượng, số đo hoặc người hỗ trợ tại Việt Nam. |
| **USGS NWIS** | Theo dõi nước sông, nước ngầm và chất lượng nước từ các trạm USGS. | Không phải hệ thống trạm nước ĐBSCL. | Nguồn thủy lợi/khí tượng Việt Nam, MRC hoặc quan trắc tại nguồn tưới. |
| **USDA NASS QuickStats** | Thống kê diện tích, sản lượng và năng suất cây. | Bảng thống kê nông nghiệp Hoa Kỳ, không phải số liệu tỉnh/huyện Việt Nam. | Thống kê Việt Nam, tài liệu địa phương hoặc hồ sơ đã xác nhận. |
| **OpenET** | Ước tính lượng nước mất qua đất và cây. | Nền tảng dữ liệu công khai được công bố mở rộng tới 48 bang liền kề Hoa Kỳ từ 2025. Không có lớp ĐBSCL trong phạm vi đang giới thiệu. | Chỉ xem xét ECOSTRESS hoặc phương pháp khác khi có người kiểm chứng. |
| **LANDFIRE** | Xem thảm thực vật và vật liệu có thể cháy. | Phủ các vùng Hoa Kỳ và lãnh thổ được hỗ trợ, không có lớp ĐBSCL cho dự án. | Chưa cần cho bản thi luân canh; tìm nguồn khác nếu thật sự đổi bài toán. |

Nguồn kiểm tra vùng phủ:

- [Web Soil Survey và các bộ đất liên quan](https://www.nrcs.usda.gov/conservation-basics/soil/getting-started-with-web-soil-survey).
- [CDL 2025](https://data.nass.usda.gov/Research_and_Science/Cropland/metadata/metadata_CDL25_FGDC-STD-001-1998.htm), [PRISM FAQ](https://prism.oregonstate.edu/faq/), [NAIP](https://www.usgs.gov/centers/eros/science/national-agriculture-imagery-program-naip-data-dictionary), [Annual NLCD](https://www.usgs.gov/centers/eros/science/annual-nlcd-data-access).
- [NLDAS](https://ldas.gsfc.nasa.gov/nldas), [các nước và lãnh thổ trong CoCoRaHS](https://media.cocorahs.org/docs/StateAdmissiontotheCoCorahsUnion2023.pdf), [NWIS](https://www.usgs.gov/centers/new-york-water-science-center/science/nwis-usgs-data-archive), [NASS QuickStats](https://www.nass.usda.gov/Quick_Stats/).
- [OpenET mở rộng vùng phủ](https://etdata.org/openet-expands-satellite-based-water-use-data-48-states-farmers-water-managers-across-nation/), [LANDFIRE](https://www.landfire.gov/).

Không nên dựa vào mô tả độ chi tiết cũ trong file BTC để chọn nguồn. Ví dụ CDL đã có thay đổi ở sản phẩm mới; dù ảnh chi tiết hơn, vấn đề không có vùng ĐBSCL vẫn giữ nguyên.

## 9. Chọn bộ nào cho từng mức tham vọng

| Mức làm | Bộ dữ liệu và thông tin | Web làm được gì | Chưa nên hứa gì |
| --- | --- | --- | --- |
| **Bắt đầu ít rủi ro nhất** | POWER + IMERG + hồ sơ hộ + ba lịch luân canh có nguồn + thông tin đất/nước phù hợp. | Bản đồ mưa, biểu đồ điều kiện vùng, so sánh các chiến lược theo quy tắc rõ và nêu phần thiếu. | Chưa tự xác định bệnh, ngập, mặn hoặc bảo đảm năng suất từng vườn. |
| **Thêm căn cứ về nước** | Bộ trên + SMAP, nếu giá trị tại vùng đủ chất lượng. | Bổ sung diễn biến đất khô/ẩm của vùng và lý do cần chú ý về nước. | Chưa tính được chính xác mỗi cây cần tưới bao nhiêu lít. |
| **Thêm căn cứ lựa chọn cây** | Bộ đầu + GAEZ và người rà soát địa phương. | Tham khảo mức phù hợp tự nhiên của cây trước khi đưa vào hai phương án thay thế. | Chưa biến mức phù hợp thành lịch vụ hoặc lợi nhuận tự động. |
| **Thêm phần nhìn cây xanh** | Bộ đầu + một trong Sentinel 2/Landsat. | Nhìn biến động cây xanh hoặc thời kỳ đất trống ở những ảnh có thể dùng. | Chưa nhận diện chắc chắn cây, bệnh và nguyên nhân cây yếu nếu chưa xây và kiểm chứng riêng. |

Các bộ trên là thành phần để xây công cụ. Chỉ khi có dữ liệu phù hợp và quy tắc nông học đã rà soát mới đưa ra nhận định tương ứng. Nếu thông tin đất/nước chưa đủ, vẫn có thể xem điều kiện vùng nhưng phải giữ phần khuyến nghị chưa đủ căn cứ.

## 10. Những thứ quan trọng mà danh sách BTC chưa cấp đủ cho team

**Vệ tinh không tự trả lời toàn bộ câu hỏi nên trồng gì và trồng như thế nào.** Đây là các phần cần bổ sung ngoài danh sách đã xếp hạng.

| Còn cần gì | Vì sao cần | Có thể lấy từ đâu | Nếu chưa có |
| --- | --- | --- | --- |
| **Lịch và đặc tính cây tại địa phương** | Biết thời điểm trồng, thời gian chiếm đất và điều kiện cây chịu được. | Tài liệu khuyến nông, cán bộ nông nghiệp và nghiên cứu phù hợp. | Chưa để AI tự tạo hai lịch thay thế như đã được xác nhận. |
| **Đặc tính đất thực tế** | Độ ẩm đất không cho biết đầy đủ đất chua, thành phần đất hoặc dinh dưỡng. | Kết quả đo/mẫu đất; nguồn đất toàn cầu như SoilGrids nếu phù hợp. SoilGrids không nằm trong danh sách BTC đang xếp hạng. | Ghi chưa biết; chỉ đưa nhận định trong phạm vi có căn cứ. |
| **Nguồn nước và độ mặn nước tưới** | Mưa của vùng khác với nước hộ thực sự dùng; nước có thể không phù hợp dù có sẵn. | Quan trắc tại nguồn tưới, bản tin phù hợp hoặc đơn vị thủy lợi. | Không tự suy độ mặn từ lượng mưa. |
| **Khả năng của hộ** | Cùng vùng nhưng khác nước dự trữ, thiết bị và mức sẵn sàng đổi cây có thể cần kế hoạch khác. | Người nông dân nhập, có lựa chọn chưa biết. | Không tự đoán từ vệ tinh. |
| **Chi phí và đầu ra tại địa phương** | Cây phù hợp tự nhiên vẫn có thể không phù hợp vốn hoặc thị trường. | Giá thực tế, thương lái/hợp tác xã, thống kê và khảo sát. | Chưa xếp theo lợi nhuận hoặc hứa tăng thu nhập. |
| **Người kiểm tra tính hợp lý** | Xác nhận các lựa chọn có áp dụng được ở vùng không. | Mentor phù hợp, cán bộ khuyến nông hoặc chuyên gia địa phương. | Trình bày là công cụ khám phá có giới hạn, không phải quyết định đã kiểm chứng ngoài ruộng. |

Nguồn ngoài danh sách để tham khảo: [SoilGrids](https://isric.org/explore/soilgrids/) và [Viện Khoa học Thủy lợi miền Nam](https://siwrr.org.vn/). Cần kiểm tra khả năng lấy số liệu thực tế; không mặc định mọi bản tin đều có file số để web đọc tự động.

## 11. Cách triển khai cho team không chuyên dữ liệu

### Bước 1 Chọn một câu hỏi trước khi tải

Ví dụ: **Lịch canh tác này rơi vào giai đoạn mưa và nhiệt như thế nào ở vùng thí điểm?** Chọn câu hỏi này giúp POWER và IMERG có vai trò cụ thể.

Chưa bắt đầu bằng yêu cầu tải mọi loại số liệu cho cả ĐBSCL.

### Bước 2 Lấy một mẫu nhỏ

- Một điểm đại diện hoặc một vùng nhỏ đã chọn.
- Một khoảng thời gian rõ ràng, ví dụ vài năm đã đầy đủ dữ liệu, dùng cho minh họa lịch sử.
- Vài thông tin cần thiết trước: nhiệt độ và mưa.
- Lưu cùng tên nguồn, thời gian dữ liệu và đơn vị.

Nếu chỉ lấy vài năm, gọi là so sánh giữa những năm đã chọn. Không tự gọi đó là mức khí hậu trung bình dài hạn.

### Bước 3 Kiểm tra số trước khi làm đẹp

| Câu hỏi kiểm tra | Ví dụ dễ hiểu |
| --- | --- |
| Có đúng nơi không | Số này của vùng ở ĐBSCL hay của một vùng Hoa Kỳ? |
| Có đúng thời gian không | Tháng đó có đủ số ngày và có dữ liệu chưa? |
| Có đúng đơn vị không | Tổng mưa cả tháng khác với lượng mưa trong một giờ. |
| Có chỗ chưa biết không | Không có dữ liệu khác với mưa bằng 0. |
| Số này đại diện vùng rộng bao nhiêu | Một con số cho vùng hàng km không phải một máy đo trong từng vườn. |
| Có trùng cùng nguồn gốc không | IMERG lấy qua hai công cụ vẫn có thể là cùng số liệu gốc. |

### Bước 4 Chia việc giao diện và tính toán

**Lớp xem:** đưa dữ liệu lên biểu đồ hoặc bản đồ cùng chú giải, nguồn và ngày.

**Phần tính:** kết hợp dữ liệu với lịch cây và điều kiện hộ; tính chỉ báo theo quy tắc có nguồn; so sánh ba phương án.

**Phần giải thích:** viết kết quả bằng mẫu câu trước. AI có thể giúp diễn đạt dễ đọc, nhưng không được tự tạo số liệu, ngưỡng cây hoặc thứ hạng.

### Bước 5 Lưu bộ dữ liệu demo

Lấy và kiểm tra trước, lưu một bản để trình diễn. Web không cần gọi lại tất cả nguồn mỗi lần người dùng đổi lớp xem. Ghi rõ ngày của dữ liệu; không gọi bản lưu là cập nhật trực tiếp.

Lưu số liệu phân tích không tự làm nền bản đồ hoạt động khi mất mạng. Team cần chuẩn bị riêng cách hiển thị vùng đất và lớp dữ liệu khi nền bản đồ ngoài không tải được, đồng thời tuân thủ quyền sử dụng.

### Bước 6 Chỉ thêm nguồn khi nó thay đổi được quyết định

Trước khi tích hợp thêm, trả lời: **Thông tin này sẽ làm thay đổi kết luận hoặc giúp kiểm tra điều gì mà bộ hiện tại chưa làm được?** Nếu chưa trả lời được, để nguồn đó sau cuộc thi.

## 12. Bảng giao việc đầu tiên

| Việc | Người phù hợp | Đầu ra cần mang về cho team |
| --- | --- | --- |
| Chọn vùng và lịch hiện trạng | Người phụ trách sản phẩm, trao đổi với người hiểu nông nghiệp. | Một vùng thí điểm và lịch canh tác có nguồn. |
| Thử POWER | Người làm code phối hợp người đọc nội dung dữ liệu. | Một bảng nhiệt độ theo thời gian, nguồn và đơn vị; một biểu đồ đọc được. |
| Thử IMERG | Người làm code, nhờ mentor dữ liệu nếu cần. | Một phần số liệu mưa có vị trí và thời gian, cùng lớp mưa hoặc biểu đồ. |
| Tìm hai chiến lược thay thế | Người tìm tài liệu và người có chuyên môn; tham khảo GAEZ khi hữu ích. | Hai lịch cùng điều kiện áp dụng và điều còn cần kiểm chứng. |
| Thu thập đất, nước và khả năng hộ | Người phụ trách người dùng. | Thông tin xác nhận được; các mục chưa biết giữ nguyên trạng thái. |
| Nối vào web | Người làm giao diện và xử lý. | Chọn đất → nhập hồ sơ → xem ba phương án → mở lý do và nguồn. |

## 13. Sáu điều không nên hiểu nhầm

1. **SMAP có độ ẩm đất không có nghĩa đã có bản đồ chất lượng đất.**
2. **Ảnh cây xanh không xác nhận cây bị bệnh gì.**
3. **Bản đồ thấp/cao không tự thành bản đồ dự báo ngập.**
4. **Dữ liệu lịch sử không tự thành dự báo những tháng sắp tới.**
5. **Nguồn ghi dữ liệu toàn cầu vẫn cần kiểm tra có giá trị dùng được ở đúng ngày và vùng của mình.**
6. **Nhiều nguồn hơn không tự làm khuyến nghị tốt hơn; quan trọng là đúng vùng, đúng việc, hiểu được số và kiểm tra được kết quả.**

**Quyết định đề xuất cho team:** bắt đầu POWER và IMERG; song song chuẩn bị dữ liệu địa phương cho cây, đất và nước. Sau khi luồng chính chạy, chọn thêm một nguồn hạng A phục vụ một câu hỏi rõ ràng.
