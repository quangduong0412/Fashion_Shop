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
