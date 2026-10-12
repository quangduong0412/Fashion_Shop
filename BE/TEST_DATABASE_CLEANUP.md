# Dọn database integration test local

Checkpoint 06/10/2026, đối chiếu tiếp ngày 08/10/2026. Thực thi từng tên cụ thể sau dry-run; không dùng wildcard hoặc `FashionHeaven.sql`.

## 14 database cũ đã xóa

Nguồn xác minh: runner cũ `tests/run-integration.ts` dùng tên timestamp/random; schema Prisma và toàn bộ fingerprint fixture tổng hợp phù hợp, kể cả tài khoản anchor test-admin, namespace email test, catalog/kho/NCC/đơn, kiểm tra dòng mồ côi. Không có consumer cấu hình, connection/runner đang chạy, view/trigger/routine/event lạ. Quyền PROCESS cho phép đối chiếu connection toàn server. Tên chứa test **không** được dùng làm bằng chứng độc lập. Database đầu tiên từng có hai connection lúc khảo sát; chỉ dọn sau lần xác minh lại thấy 0 connection.

- `fashionhaven_test_1790934939858_fac78935`
- `fashionhaven_test_1790935807351_526535c0`
- `fashionhaven_test_1790946650699_9ea2f7c4`
- `fashionhaven_test_1790946795600_8dd7924f`
- `fashionhaven_test_1790947213924_280b6ef8`
- `fashionhaven_test_1790947651901_2d72a859`
- `fashionhaven_test_1790948158422_519b1647`
- `fashionhaven_test_1790948543740_eb4fbf32`
- `fashionhaven_test_1790948667386_1a0230f3`
- `fashionhaven_test_1790949174631_a2156b6f`
- `fashionhaven_test_1790949288704_7eb7be91`
- `fashionhaven_test_1790949462856_afad322f`
- `fashionhaven_test_1790949790870_9021d7f4`
- `fashionhaven_test_1790949941924_e0c3eed9`

## Hai database giữ lại

- `fashionhaven_test_1790947556855_6730d9c6`
- `fashionhaven_test_1790947607214_dfda8761`

Cả hai có 22 bảng rỗng, 0 connection ở lượt liệt kê gần nhất, không marker/manifest nguồn sở hữu. Schema rỗng không đủ chứng minh dữ liệu dùng một lần. Giữ nguyên; cần người tạo cung cấp nguồn/mục đích hoặc xác nhận không còn consumer trước khi dọn.

## Runner mới đã kiểm tra

- Thành công: database `fashionhaven_test_1791042014768_d224981a` (52 mục) và `fashionhaven_test_1791094617676_f3548877` (63 mục) đã tự dọn trong finally.
- Setup cố ý lỗi: `fashionhaven_test_1791094693214_e415a213` được dọn; trả exit code lỗi.
- Test cố ý lỗi: `fashionhaven_test_1791094693859_604057f2` được dọn; giữ exit code 2.
- Browser lỗi: `fashionhaven_test_1791094865845_40714eff` được dọn, không che lỗi browser.
- KEEP_TEST_DB=true: `fashionhaven_test_1791094953462_025ae44f` được giữ có chủ đích sau probe exit 2. `--drop <tên> --dry-run` xác minh marker/manifest và **không xóa**; lệnh DROP riêng sau đó đã xóa đúng database này.
- Full suite 05/10: `fashionhaven_test_1791178742560_adf830d0` đạt 71/71, đã tự DROP; lượt 70/70 có selected cart `fashionhaven_test_1791178620490_4f031086` cũng tự DROP. Các lượt lỗi selector/typing của đợt 05/10 đều dọn đúng database và giữ lỗi gốc.
- Lượt `fashionhaven_test_1791095211640_8f871eb1` không còn trong dry-run mới; đầu ra cuối bị mất khi phiên công cụ chuyển lượt nên không dùng lượt này để tuyên bố browser đạt.

Manifest/lease được lưu tại `BE/test-artifacts/db-manifests` ngoài Git. Runtime receipt giữ bằng chứng database do chính process tạo; helper legacy chỉ dọn sau fingerprint đầy đủ. Nếu lỗi giữa CREATE và schema setup, empty database vẫn chỉ dọn khi có bằng chứng sở hữu của lần chạy này. Khi không đóng được child/connection, runner giữ database và báo cleanup lỗi; không che lỗi test gốc.

Cách dùng, quyền cần thiết và KEEP_TEST_DB ở [README](README.md#kiểm-tra). Database ứng dụng và hệ thống được bảo vệ; các migration mới chỉ thêm bảng/cột, không reset/seed. Đối chiếu dữ liệu ứng dụng trong đợt triển khai: 16 sản phẩm, 134 biến thể, 6 đơn, 6 dòng đơn, không tạo đơn test trong đó.

## Đợt mua sắm theo tài khoản — 06/10/2026

Các database do runner tạo sau đây đều đã được đóng kết nối và dọn trong finally; không có fixture trong database cửa hàng:

- `fashionhaven_test_1791295835432_98afbb31`: 77/77 API/unit.
- `fashionhaven_test_1791296061219_bb23b1c6`: lỗi đường dẫn Playwright runtime; giữ lỗi gốc, đã dọn.
- `fashionhaven_test_1791296108026_a93a7a42`: lỗi selector checkbox bất đồng bộ; đã dọn.
- `fashionhaven_test_1791296177968_5ac7f64f`: lỗi accessible name nút đăng xuất; đã dọn.
- `fashionhaven_test_1791296369104_bbec3406`: 78/78, đã dọn.
- `fashionhaven_test_1791296604382_86bca6c3`: **79/79** với browser FE/admin, đã dọn. TAP local: `BE/test-artifacts/acceptance-2026-10-06.tap` (ngoài Git).

Dry-run sau đợt này chỉ còn hai database không xác minh nguồn ở mục trên; tiếp tục giữ nguyên. Database ứng dụng vẫn 16 sản phẩm / 134 SKU / 6 đơn / 6 dòng đơn; bốn bảng mua sắm mới trống. Dữ liệu demo được người dùng yêu cầu bổ sung ngày 08/10 được theo dõi riêng, không phải fixture integration.


## Kiểm tra 08/10/2026

- `fashionhaven_test_1791419811111_1942818d`: 83/83 gồm browser và demo rollback, đã dọn.
- `fashionhaven_test_1791420708487_2a783c82`: lượt phát hiện lỗi cập nhật ngày voucher/cơ chế fault test, 89 pass / 4 fail gồm nhóm cha; giữ lỗi gốc, đã dọn.
- `fashionhaven_test_1791420805568_e2667bab`: sau sửa, 93/93 API/MySQL/unit, không bật browser; đã dọn.

Không dọn database demo bằng công cụ cleanup integration. Không tạo fixture trong database ứng dụng khi khôi phục P2022.

### 08/10/2026 — bộ demo 65

`npm.cmd test` đạt 93/93. Runner tạo và dọn đúng database `fashionhaven_test_1791421774802_863415f4` trong finally sau khi đóng child/kết nối. TAP ignored: `test-artifacts/demo65-api-2026-10-08.tap`. Database demo `fashionhaven_demo_v1` là dữ liệu trình diễn được giữ có chủ đích, không thuộc cleanup test. Hai schema rỗng chưa xác minh cũ vẫn được giữ nguyên.

### 08/10/2026 — khôi phục database gốc

Suite 94/94; đã xóa đúng database runner tạo `fashionhaven_test_1791422488705_fccfa32a` trong finally. Không xóa database cửa hàng hoặc database demo đang được giữ riêng.

### 08/10/2026 — startup và catalog

Các database đúng ownership do runner tạo dưới đây đã DROP trong finally sau khi đóng kết nối:

- fashionhaven_test_1791423389818_03f4ca6e — lượt phát hiện test IPv4/IPv6 và assert thứ tự voucher cần sửa.
- fashionhaven_test_1791423545446_2c94c97e — 99/99 đạt.
- fashionhaven_test_1791423949477_6b59e005 — bản cuối 100/100 đạt.

Không xóa database cửa hàng, database demo giữ riêng, hoặc hai schema legacy chưa xác minh trước đây.

### 11/10/2026 — checkout, voucher và đổi trả

Các DB test do runner tự tạo dưới đây đều đã được DROP trong `finally`; lỗi selector/assert ban đầu giữ nguyên lỗi gốc và cũng không để sót DB:

- `fashionhaven_test_1791735172576_7cf3e485` — browser đổi trả dừng ở selector nhận hàng; đã dọn.
- `fashionhaven_test_1791735355714_e318b0eb` — browser đổi trả dừng ở selector số lượng; đã dọn.
- `fashionhaven_test_1791735553825_45eda622` — API thành công, selector trạng thái test chưa đúng; đã dọn.
- `fashionhaven_test_1791735629629_9ebb8626` — đổi trả browser FE/admin **1/1**; đã dọn.
- `fashionhaven_test_1791735697450_1c115dc2` — ca retry gửi payload khác; đã dọn.
- `fashionhaven_test_1791735809240_c4ae2752` — API/MySQL/unit **107/107**; đã dọn.
- `fashionhaven_test_1791735904692_67a4a0e2` — browser checkout/voucher/admin + API suite **108/108**; đã dọn.

Dry-run gần nhất vẫn chỉ liệt kê `fashionhaven_test_1790947556855_6730d9c6` và `fashionhaven_test_1790947607214_dfda8761`: mỗi DB có 22 bảng rỗng, 0 kết nối nhưng không có marker/manifest/fingerprint. Đã giữ nguyên vì tên và cấu trúc rỗng không chứng minh được nguồn sở hữu.

Các lượt cô lập trước trong cùng đợt tiếp tục ngày 11/10/2026 cũng đã tự dọn, kể cả khi browser selector thất bại:

- `fashionhaven_test_1791730560844_bde5c535` — voucher browser, đã dọn.
- `fashionhaven_test_1791732339085_e43aa219` — API/MySQL suite, đã dọn.
- `fashionhaven_test_1791732821826_5bb0d149`, `fashionhaven_test_1791733066382_6129a266`, `fashionhaven_test_1791733328325_4fede874`, `fashionhaven_test_1791733638939_83d3f38f`, `fashionhaven_test_1791734057177_cc4a224b`, `fashionhaven_test_1791734236195_4adfe5e3`, `fashionhaven_test_1791734430060_0f25e0f0`, `fashionhaven_test_1791734677629_456266fe`, `fashionhaven_test_1791734780615_6e1cc337`, `fashionhaven_test_1791734899156_e87140ea` — browser/debug iterations, all removed by runner.

### 12/10/2026 — private return evidence and reports

- `fashionhaven_test_1791815123393_339e200c` — integration API/MySQL **107/107**, đã DROP trong finally.
- `fashionhaven_test_1791815209654_ccab827e` — browser đổi trả fail do test đọc database trước khi POST upload kết thúc; đã DROP trong finally.
- `fashionhaven_test_1791815296289_41f7170b` — browser đổi trả FE upload/view + admin view, receive/inspect/restock/refund **1/1**, đã DROP trong finally.
- `fashionhaven_test_1791815347120_554f0570` — browser báo cáo fail selector nút cũ; đã DROP trong finally.
- `fashionhaven_test_1791815565734_d480b68b` — browser báo cáo fail assertion tiêu đề CSV cũ; đã DROP trong finally.
- `fashionhaven_test_1791815770930_8688e3b4` — browser báo cáo đang chạy lại sau cập nhật selector/assertion.
- `fashionhaven_test_1791816154819_42beec05` — browser Reports + API/unit **108/108**, đã DROP trong finally.
- `fashionhaven_test_1791816269105_4960dbdf` — đổi trả browser trên FE/admin build cuối **1/1**, đã DROP trong finally.
- `fashionhaven_test_1791816533495_07784262` — đổi trả browser lặp lại sau khi sửa loading ReportsView, **1/1**, đã DROP trong finally.

Lượt tích hợp đầy đủ 12/10/2026 sau khi sửa race login và phân trang đổi trả:

- `fashionhaven_test_1791816572229_c7f98f1f`, `fashionhaven_test_1791816771930_ddaa0119`, `fashionhaven_test_1791817063010_4884ef32`, `fashionhaven_test_1791817324369_9fb7d989`, `fashionhaven_test_1791817584569_0c5347e2` — lần lượt bắt được lỗi assertion/selector/race của test browser; runner đã cleanup sau mỗi lần.
- `fashionhaven_test_1791817548480_b68bb2a0` — đổi trả browser độc lập **1/1**, đã DROP.
- `fashionhaven_test_1791817776994_93328674` — full `npm.cmd run test:browser`, **108/108**, đã DROP trong finally.
- `fashionhaven_test_1791818143561_d996ab2b` — full suite bắt giả định hoàn đủ item là `REFUNDED` dù phí giao không được hoàn; đã DROP.
- `fashionhaven_test_1791818541008_a576973b`, `fashionhaven_test_1791818639452_ad4c2593` — browser selector chưa đợi panel admin tải trạng thái mới; đã DROP.
- `fashionhaven_test_1791818762812_0ecc768c`, `fashionhaven_test_1791819178808_d8ca3c5e` — đổi trả browser **1/1** với response refresh và số tiền hoàn một phần; đã DROP.
- `fashionhaven_test_1791818829659_7c3a2109` — full suite bắt đúng trường hợp hoàn một phần khi có cước; runner đã DROP.
- `fashionhaven_test_1791819251673_28937eea` — full `npm.cmd run test:browser` cuối đạt **108/108**, đã DROP trong finally.

Dry-run mới nhất (`npm.cmd run test:db:list`) chỉ còn liệt kê hai schema legacy bên dưới. Chúng có 22 bảng rỗng, 0 kết nối hoạt động nhưng thiếu marker/manifest/fingerprint; giữ lại vì không xác minh được nguồn sở hữu. Không database nào trong danh sách trên là database ứng dụng `FashionHeaven`.

Không xóa hai DB legacy không xác minh ownership ở đầu tài liệu hoặc database phát triển `FashionHeaven`.
