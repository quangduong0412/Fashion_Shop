const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

// This fixture modifies only the disposable integration database and removes its own uploaded files.
exports.runMediaBrowser = async ({ admin, page, customerUrl, prisma, directory, base }) => {
  const database = await prisma.$queryRawUnsafe('SELECT DATABASE() AS name');
  assert.match(database[0].name, /^fashionhaven_test_\d+_[a-f0-9]{8}$/);
  assert.equal(database[0].name, process.env.TEST_DATABASE);
  const uploaded = [];
  const buffer = await fs.readFile(path.resolve(__dirname, '../../FE/assets/images/favicon.png'));
  const upload = async (label, filename) => {
    const responsePromise = admin.waitForResponse(response => response.url().includes('/api/upload') && response.request().method() === 'POST');
    await admin.getByLabel(label, { exact: true }).setInputFiles({ name: filename, mimeType: 'image/png', buffer });
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const body = await response.json();
    assert.match(body.imageUrl, /^\/uploads\/[a-f0-9-]{36}\.png$/);
    uploaded.push(body.imageUrl);
    await admin.waitForFunction(() => Array.from(document.querySelectorAll('input[type=file]')).every(input => !input.matches(':disabled')));
    return body.imageUrl;
  };
  const imageLoaded = async (image, minimumWidth = 0) => page.waitForFunction(({ suffix, minimumWidth }) => Array.from(document.images).some(img => img.src.endsWith(suffix) && img.complete && img.naturalWidth > 0 && img.getBoundingClientRect().width > minimumWidth), { suffix: image, minimumWidth });
  const mediaRoute = async route => {
    const original = new URL(route.request().url());
    const response = await route.fetch({ url: base.replace(/\/api$/, '') + original.pathname });
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
  };
  await page.context().route('**/uploads/**', mediaRoute);
  await page.context().route('**/images/**', mediaRoute);
  let primaryError;
  try {
    console.log('Browser: category image upload, symbol and visibility');
    await admin.getByRole('button', { name: 'Danh mục & Ảnh', exact: true }).click();
    await admin.getByRole('button', { name: '+ Thêm danh mục', exact: true }).click();
    let dialog = admin.getByRole('dialog');
    await dialog.getByLabel('Tên danh mục *', { exact: true }).fill('Browser media category');
    await dialog.getByLabel('Biểu tượng', { exact: true }).selectOption('shirt');
    await dialog.getByLabel('Thứ tự hiển thị', { exact: true }).fill('1');
    const categoryImage = await upload('Tải ảnh danh mục', 'synthetic-category.png');
    await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const category = await prisma.loaiHang.findFirstOrThrow({ where: { TenLoaiHang: 'Browser media category' } });
    assert.equal(category.Anh, categoryImage); assert.equal(category.Icon, 'shirt'); assert.equal(category.Position, 1);
    await admin.getByRole('button', { name: 'Sửa danh mục Browser media category', exact: true }).click();
    dialog = admin.getByRole('dialog');
    await dialog.getByLabel('Thứ tự hiển thị', { exact: true }).fill('2');
    await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal((await prisma.loaiHang.findUniqueOrThrow({ where: { MaLoaiHang: category.MaLoaiHang } })).Anh, categoryImage);

    console.log('Browser: product gallery upload, primary image reorder and variant image');
    await admin.getByRole('button', { name: 'Sản phẩm & Tồn kho', exact: true }).click();
    await admin.getByRole('button', { name: 'Sửa sản phẩm Browser created variants', exact: true }).click();
    dialog = admin.getByRole('dialog');
    const firstImage = await upload('Tải ảnh sản phẩm', 'synthetic-front.png');
    const secondImage = await upload('Tải ảnh sản phẩm', 'synthetic-back.png');
    await dialog.getByRole('button', { name: 'Đưa ảnh 2 lên trước', exact: true }).click();
    await dialog.getByLabel('Thương hiệu', { exact: true }).fill('Synthetic media label');
    await dialog.getByLabel('Chất liệu', { exact: true }).fill('Synthetic test fabric');
    await dialog.getByLabel('Mô tả sản phẩm', { exact: true }).fill('Synthetic catalog description for browser acceptance.');
    await dialog.getByText('Ảnh riêng của biến thể 2 · đang dùng ảnh sản phẩm', { exact: true }).click();
    const variantImage = await upload('Tải ảnh biến thể 2', 'synthetic-white.png');
    await dialog.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    let product = await prisma.sanPham.findFirstOrThrow({ where: { TenSanPham: 'Browser created variants' }, include: { bienThes: { orderBy: { MaBienThe: 'asc' } } } });
    assert.equal(product.Anh, secondImage); assert.deepEqual(product.Gallery.map(image => image.url), [secondImage, firstImage]);
    assert.equal(product.bienThes[1].Anh, variantImage); assert.equal(product.ChatLieu, 'Synthetic test fabric');
    await admin.getByRole('button', { name: 'Sửa sản phẩm Browser created variants', exact: true }).click();
    dialog = admin.getByRole('dialog');
    await dialog.getByLabel(/^Giá bán mặc định/).fill('51000');
    await dialog.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    product = await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham }, include: { bienThes: { orderBy: { MaBienThe: 'asc' } } } });
    assert.equal(product.Anh, secondImage); assert.deepEqual(product.Gallery.map(image => image.url), [secondImage, firstImage]);
    assert.equal(product.bienThes[1].Anh, variantImage);
    await admin.screenshot({ path: path.join(directory, 'admin-media-product-gallery.png'), fullPage: true });

    console.log('Browser: real FE category and gallery on mobile and desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(customerUrl + '/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Xem danh mục Browser media category', exact: true }).waitFor();
    await imageLoaded(categoryImage);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Browser created variants', { exact: true }).first().waitFor();
    await page.getByText('Synthetic catalog description for browser acceptance.', { exact: true }).waitFor();
    await imageLoaded(secondImage, 180);
    await page.getByRole('button', { name: 'Xem ảnh 2: Browser created variants', exact: true }).click();
    await imageLoaded(firstImage, 180);
    await page.getByRole('button', { name: 'Màu Trắng', exact: true }).click();
    await page.getByText('SKU: UI-WHITE-ONE', { exact: true }).waitFor();
    await imageLoaded(variantImage, 180);
    await page.screenshot({ path: path.join(directory, 'customer-media-variant-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(directory, 'customer-media-gallery-desktop.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

    console.log('Browser: neutral fallback for failed category and product images');
    await prisma.sanPham.update({ where: { MaSanPham: product.MaSanPham }, data: { Anh: '/images/synthetic-missing.png', Gallery: [{ url: '/images/synthetic-missing.png' }] } });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Ảnh đang cập nhật', { exact: true }).waitFor();
    assert.equal(await page.locator('img[src*="googleusercontent"],img[src*="placehold.co"]').count(), 0);
    await page.screenshot({ path: path.join(directory, 'customer-media-neutral-fallback.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await admin.setViewportSize({ width: 390, height: 844 });
    await admin.getByRole('combobox', { name: /^Chức năng/ }).selectOption('categories');
    await admin.getByRole('heading', { name: 'Danh mục sản phẩm', exact: true }).waitFor();
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await admin.screenshot({ path: path.join(directory, 'admin-media-categories-mobile.png'), fullPage: true });
    await admin.setViewportSize({ width: 1440, height: 1000 });
  } catch (error) {
    primaryError = error;
    await Promise.allSettled([
      admin.screenshot({ path: path.join(directory, 'admin-media-failure.png'), fullPage: true }),
      page.screenshot({ path: path.join(directory, 'customer-media-failure.png'), fullPage: true }),
    ]);
    throw error;
  } finally {
    const failures = [];
    for (const image of uploaded) {
      const filename = image.slice('/uploads/'.length);
      assert.match(filename, /^[a-f0-9-]{36}\.png$/);
      await fs.unlink(path.resolve(__dirname, '../uploads', filename)).catch(error => { if (error.code !== 'ENOENT') failures.push(error); });
    }
    if (failures.length) {
      console.error('Media fixture cleanup failed:', failures.map(error => error.message));
      if (!primaryError) throw new AggregateError(failures, 'Uploaded media fixture cleanup failed');
    }
  }
};
