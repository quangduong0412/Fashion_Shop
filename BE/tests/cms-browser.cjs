const assert = require('node:assert/strict');
const path = require('node:path');

// Run with the real built apps and the existing isolated HTTP API route.
exports.checkCmsBrowser = async ({ admin, page, customerUrl, prisma, directory }) => {
  console.log('Browser: administrator publishes an article and customer reads its detail');
  await admin.getByRole('button', { name: 'Bài viết', exact: true }).click();
  await admin.getByRole('button', { name: 'Thêm bài viết', exact: true }).click();
  let dialog = admin.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Lưu bài viết', exact: true }).click();
  await dialog.getByText('Nhập tiêu đề và nội dung bài viết.', { exact: true }).waitFor();
  await dialog.getByLabel('Tiêu đề', { exact: true }).fill('Browser CMS acceptance article');
  await dialog.getByLabel('Nội dung', { exact: true }).fill('Synthetic browser article content.\nSecond paragraph preserved.');
  await dialog.getByRole('button', { name: 'Lưu bài viết', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const post = await prisma.baiViet.findFirstOrThrow({ where: { TieuDe: 'Browser CMS acceptance article' } });
  assert.equal(post.MoTa, 'Synthetic browser article content.\nSecond paragraph preserved.');
  await page.goto(`${customerUrl}/news`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Đọc bài viết Browser CMS acceptance article', exact: true }).click();
  await page.waitForURL(new RegExp(`/article/${post.MaBaiViet}$`));
  await page.getByRole('heading', { name: 'Browser CMS acceptance article', exact: true }).waitFor();
  await page.getByText(/Second paragraph preserved/).filter({ visible: true }).waitFor();
  await page.screenshot({ path: path.join(directory, 'customer-article-mobile.png'), fullPage: true });

  console.log('Browser: customer submits contact and administrator sees the real inbox');
  await page.goto(`${customerUrl}/contact`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Gửi lời nhắn', exact: true }).click();
  await page.getByText('Vui lòng nhập họ tên và nội dung cần hỗ trợ.', { exact: true }).waitFor();
  await page.getByLabel('Họ tên', { exact: true }).fill('Browser CMS contact');
  await page.getByLabel('Email nhận phản hồi', { exact: true }).fill('browser-contact@example.invalid');
  await page.getByLabel('Nội dung cần hỗ trợ', { exact: true }).fill('Synthetic browser support request');
  await page.getByRole('button', { name: 'Gửi lời nhắn', exact: true }).click();
  await page.getByText('Đã tiếp nhận yêu cầu. Cửa hàng sẽ phản hồi qua email bạn cung cấp.', { exact: true }).waitFor();
  const contact = await prisma.lienHe.findFirstOrThrow({ where: { HoTen: 'Browser CMS contact' } });
  assert.equal(contact.Email, 'browser-contact@example.invalid');
  await page.screenshot({ path: path.join(directory, 'customer-contact-mobile.png'), fullPage: true });
  await admin.getByRole('button', { name: 'Liên hệ khách hàng', exact: true }).click();
  await admin.getByLabel('Tìm lời nhắn', { exact: true }).fill('Browser CMS contact');
  await admin.getByText('Synthetic browser support request', { exact: true }).waitFor();
  await admin.getByRole('button', { name: 'Xem lời nhắn', exact: true }).click();
  dialog = admin.getByRole('dialog');
  await dialog.getByText('Synthetic browser support request', { exact: true }).waitFor();
  assert.match(await dialog.getByRole('link', { name: 'Mở email phản hồi' }).getAttribute('href'), /^mailto:/);
  await admin.screenshot({ path: path.join(directory, 'admin-contact-detail.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
};
