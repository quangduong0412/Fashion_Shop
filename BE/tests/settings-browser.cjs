const assert = require('node:assert/strict');
const path = require('node:path');

// Call after the original checkout assertions: this intentionally changes new-order fees.
exports.checkSettingsBrowser = async ({ admin, page, customerUrl, prisma, directory }) => {
  console.log('Browser: administrator saves store settings and customer reads published information');
  await admin.getByRole('button', { name: /^Cài đặt/ }).click();
  await admin.getByLabel('Tên cửa hàng', { exact: true }).fill('Browser configured Fashion Haven');
  await admin.getByLabel('Email liên hệ', { exact: true }).fill('browser-store@example.invalid');
  await admin.getByLabel('Điện thoại cửa hàng', { exact: true }).fill('0900000001');
  await admin.getByLabel('Địa chỉ cửa hàng', { exact: true }).fill('Synthetic configured shop address');
  await admin.getByLabel('Phí giao hàng (VND)', { exact: true }).fill('25000');
  await admin.getByLabel('Miễn phí từ tiền hàng (VND)', { exact: true }).fill('500000');
  await admin.getByLabel('Nội dung chính sách giao hàng', { exact: true }).fill('Synthetic shipping policy stored in database.');
  await admin.getByLabel('Nội dung chính sách đổi trả', { exact: true }).fill('Synthetic return policy stored in database.');
  await admin.getByRole('button', { name: '+ Thêm banner', exact: true }).click();
  await admin.getByLabel('Tiêu đề banner 1', { exact: true }).fill('Browser published fashion banner');
  await admin.getByLabel('Chữ trên nút banner 1', { exact: true }).fill('Đọc câu chuyện');
  await admin.getByLabel('Mô tả banner 1', { exact: true }).fill('Synthetic banner subtitle');
  await admin.getByLabel('Liên kết banner 1', { exact: true }).fill('/news');
  await admin.getByLabel('Ảnh banner 1', { exact: true }).fill('/images/thoi-trang-cong-so.jpg');
  await admin.getByRole('checkbox', { name: /Banner 1/ }).check();
  await admin.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  await admin.getByText('Nhập lý do cập nhật để lưu vào lịch sử.', { exact: true }).waitFor();
  await admin.getByLabel('Lý do cập nhật cài đặt', { exact: true }).fill('Synthetic browser store configuration');
  await admin.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  await admin.getByText('Đã lưu cài đặt. Ứng dụng và các lần đặt hàng mới sử dụng cấu hình này.', { exact: true }).waitFor();
  const record = await prisma.storeSettings.findUniqueOrThrow({ where: { Id: 1 } });
  assert.equal(record.Value.storeName, 'Browser configured Fashion Haven');
  assert.equal(record.Value.shipping.fee, 25000); assert.equal(record.Value.banners[0].isActive, true);
  assert.equal(await prisma.settingsAudit.count({ where: { Version: record.Version, Note: 'Synthetic browser store configuration' } }), 1);
  await admin.screenshot({ path: path.join(directory, 'admin-store-settings-desktop.png'), fullPage: true });

  await page.goto(`${customerUrl}/contact`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Browser configured Fashion Haven', { exact: true }).waitFor();
  await page.getByText('Synthetic configured shop address', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Chính sách giao hàng →', exact: true }).click();
  await page.getByText('Synthetic shipping policy stored in database.', { exact: true }).waitFor();
  await page.getByText('Phí giao hàng cho một lần đặt: 25.000đ', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Đổi trả', exact: true }).click();
  await page.getByText('Synthetic return policy stored in database.', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(directory, 'customer-store-policies-mobile.png'), fullPage: true });

  await page.goto(customerUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Browser published fashion banner', { exact: true }).waitFor();
  await page.getByText('Đọc câu chuyện', { exact: true }).click();
  await page.waitForURL(/\/news$/);
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  await admin.screenshot({ path: path.join(directory, 'admin-store-settings-mobile.png'), fullPage: true });
  await admin.setViewportSize({ width: 1440, height: 1000 });
};
