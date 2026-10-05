# Dọn database integration test local

Checkpoint 05/10/2026. Thực thi từng tên cụ thể sau dry-run; không dùng wildcard hoặc `FashionHeaven.sql`.

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
