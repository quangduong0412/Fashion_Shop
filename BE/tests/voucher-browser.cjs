const assert = require('node:assert/strict');
const path = require('node:path');

const isApi = (request, route) => request.url().includes(`/api/${route}`) && request.method() === 'POST';
const localDateTime = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

exports.runVoucherBrowser = async ({ browser, admin, customerUrl, base, productId, prisma, directory, routeApi, errors }) => {
  const schema = await prisma.$queryRawUnsafe('SELECT DATABASE() AS name');
  assert.equal(schema[0].name, process.env.TEST_DATABASE);
  assert.match(schema[0].name, /^fashionhaven_test_\d+_[a-f0-9]{8}$/);

  const contexts = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  contexts.push(context);
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/api/**', routeApi);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('request', request => {
    if (/\/api\/orders\/(?:quote|checkout)$/.test(request.url())) console.log('Voucher customer request:', request.method(), request.url());
  });
  page.on('requestfailed', request => {
    if (/\/api\/orders\/(?:quote|checkout)$/.test(request.url())) console.error('Voucher customer request failed:', request.method(), request.url(), request.failure()?.errorText);
  });
  page.on('response', response => {
    if (/\/api\/orders\/(?:quote|checkout)$/.test(response.url())) console.log('Voucher customer response:', response.status(), response.request().method(), response.url());
  });
  admin.on('requestfailed', request => {
    if (request.url().includes('/vouchers')) console.error('Voucher browser request failed:', request.method(), request.url(), request.failure()?.errorText);
  });
  admin.on('response', response => {
    if (response.url().includes('/vouchers')) console.log('Voucher browser response:', response.status(), response.request().method(), response.url());
  });

  try {
    console.log('Browser: create/edit/pause vouchers in admin');
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.getByRole('button', { name: 'Voucher & ưu đãi', exact: true }).click();
    await admin.getByRole('heading', { name: 'Voucher & ưu đãi', exact: true }).waitFor();

    const createVoucher = async (code, value, minSubtotal, dates) => {
      await admin.getByRole('button', { name: 'Tạo voucher', exact: true }).click();
      const form = admin.getByRole('form', { name: 'Thông tin voucher' });
      await form.getByLabel('Mã voucher').fill(code);
      await form.getByLabel('Mức giảm (đ)').fill(String(value));
      await form.getByLabel('Đơn tối thiểu (đ)').fill(String(minSubtotal));
      if (dates) {
        await form.getByLabel('Bắt đầu (giờ máy)').fill(dates.startsAt);
        await form.getByLabel('Kết thúc (giờ máy)').fill(dates.endsAt);
      }
      const saved = admin.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/vouchers'));
      await form.getByRole('button', { name: 'Lưu voucher', exact: true }).click();
      assert.equal((await saved).status(), 201);
      const row = admin.getByRole('row').filter({ hasText: code });
      await row.waitFor();
      return row;
    };

    const validRow = await createVoucher('BROWSER-VALID', 10000, 100000);
    const validVoucherId = (await prisma.voucher.findUniqueOrThrow({ where: { Code: 'BROWSER-VALID' } })).Id;
    await validRow.getByRole('button', { name: 'Sửa', exact: true }).click();
    const editForm = admin.getByRole('form', { name: 'Thông tin voucher' });
    await editForm.getByLabel('Mức giảm (đ)').fill('12000');
    const updated = admin.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith(`/api/vouchers/${validVoucherId}`));
    const refreshed = admin.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/api/vouchers'));
    await editForm.getByRole('button', { name: 'Lưu voucher', exact: true }).click();
    assert.equal((await updated).status(), 200);
    assert.equal((await refreshed).status(), 200);
    const savedVoucher = await prisma.voucher.findUniqueOrThrow({ where: { Code: 'BROWSER-VALID' } });
    assert.equal(Number(savedVoucher.Value), 12000);
    await admin.waitForFunction(({ code, amount }) => Array.from(document.querySelectorAll('tbody tr')).some(row => row.innerText.includes(code) && row.innerText.includes(amount)), { code: 'BROWSER-VALID', amount: '12.000' });

    const now = new Date();
    const pastStart = localDateTime(new Date(now.getTime() - 3 * 86400000));
    const pastEnd = localDateTime(new Date(now.getTime() - 2 * 86400000));
    await createVoucher('BROWSER-EXPIRED', 5000, 0, { startsAt: pastStart, endsAt: pastEnd });
    await createVoucher('BROWSER-MINIMUM', 5000, 500000);

    const product = await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: productId }, include: { bienThes: true } });
    assert.ok(product.bienThes.some(variant => variant.DonGia === 120000 && variant.SoLuong > 1), 'Voucher checkout fixture must have an available priced SKU');
    const stockBeforeCheckout = product.SoLuong;
    const registration = await fetch(base + '/users/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Browser voucher customer', email: 'browser-voucher@example.invalid', password: 'BrowserVoucher1!' })
    });
    assert.equal(registration.status, 201);
    const customerId = (await registration.json()).user.id;

    console.log('Browser: apply voucher, confirm VND total and place COD order');
    await page.goto(`${customerUrl}/login?returnTo=/cart`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email hoặc Tên đăng nhập').fill('browser-voucher@example.invalid');
    await page.getByPlaceholder('Mật khẩu', { exact: true }).fill('BrowserVoucher1!');
    const loginResponse = page.waitForResponse(response => isApi(response.request(), 'users/login'));
    await page.getByText('ĐĂNG NHẬP', { exact: true }).click();
    assert.equal((await loginResponse).status(), 200);
    await page.waitForURL(url => new URL(url).pathname === '/cart');
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Synthetic garment', { exact: true }).first().waitFor();
    await page.getByText('Thêm vào giỏ', { exact: true }).click();
    await page.getByText('Đã thêm sản phẩm vào giỏ hàng.', { exact: true }).waitFor();
    await page.goto(`${customerUrl}/cart`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Synthetic garment', { exact: true }).waitFor();
    await page.getByLabel('Họ tên người nhận').fill('Browser voucher recipient');
    await page.getByLabel('Số điện thoại nhận hàng').fill('0900000000');
    await page.getByLabel('Địa chỉ nhận hàng').fill('Synthetic voucher acceptance address');
    await page.getByLabel('Mã voucher').fill('BROWSER-VALID');
    const validQuoteResponse = page.waitForResponse(response => {
      const request = response.request();
      try { return isApi(request, 'orders/quote') && request.postDataJSON().voucherCode === 'BROWSER-VALID'; }
      catch { return false; }
    });
    await page.getByRole('button', { name: 'Áp dụng voucher', exact: true }).click();
    console.log('Browser: waiting for valid voucher quote');
    const validResponse = await validQuoteResponse;
    assert.equal(validResponse.status(), 200);
    const quote = await validResponse.json();
    assert.equal(quote.subtotal, 120000);
    assert.equal(quote.discount, 12000);
    assert.equal(quote.total, quote.subtotal + quote.shippingFee - quote.discount);
    await page.getByText(/^Đã áp dụng BROWSER-VALID/).waitFor();
    await page.getByText('Tiền hàng + phí vận chuyển − giảm giá = tổng thanh toán', { exact: true }).waitFor();
    await page.getByText(`${quote.total.toLocaleString('vi-VN')}đ`, { exact: true }).first().waitFor();

    const checkout = page.waitForResponse(response => isApi(response.request(), 'orders/checkout'));
    await page.getByText('Đặt hàng COD', { exact: true }).click();
    const checkoutResponse = await checkout;
    assert.equal(checkoutResponse.status(), 201);
    await page.waitForURL(/\/orders$/);
    const order = await prisma.phieuXuat.findFirstOrThrow({ where: { MaKhachHang: customerId }, orderBy: { MaPhieuXuat: 'desc' } });
    assert.equal(order.VoucherCode, 'BROWSER-VALID');
    assert.equal(Number(order.TienHang), quote.subtotal);
    assert.equal(Number(order.PhiGiaoHang), quote.shippingFee);
    assert.equal(Number(order.GiamGiaDon), quote.discount);
    assert.equal(order.TongTien, quote.total);
    assert.equal(order.TongTien, Number(order.TienHang) + Number(order.PhiGiaoHang) - Number(order.GiamGiaDon));
    assert.equal(order.VoucherSnapshot.discount, quote.discount);
    assert.equal(await prisma.voucherUsage.count({ where: { VoucherId: (await prisma.voucher.findUniqueOrThrow({ where: { Code: 'BROWSER-VALID' } })).Id, CustomerId: customerId, Status: 'ACTIVE' } }), 1);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: productId } })).SoLuong, stockBeforeCheckout - 1);
    await page.screenshot({ path: path.join(directory, 'customer-voucher-checkout-mobile.png'), fullPage: true });

    console.log('Browser: reject expired and below-minimum vouchers');
    const rejectVoucher = async (code, expectedCode, expectedError) => {
      await page.goto(`${customerUrl}/product/${product.MaSanPham}`, { waitUntil: 'domcontentloaded' });
      await page.getByText('Synthetic garment', { exact: true }).first().waitFor();
      await page.getByText('Thêm vào giỏ', { exact: true }).click();
      await page.getByText('Đã thêm sản phẩm vào giỏ hàng.', { exact: true }).waitFor();
      await page.goto(`${customerUrl}/cart`, { waitUntil: 'domcontentloaded' });
      await page.getByText('Synthetic garment', { exact: true }).waitFor();
      await page.getByLabel('Họ tên người nhận').fill('Browser voucher recipient');
      await page.getByLabel('Số điện thoại nhận hàng').fill('0900000000');
      await page.getByLabel('Địa chỉ nhận hàng').fill('Synthetic voucher acceptance address');
      await page.getByLabel('Mã voucher').fill(code);
      const rejectedQuote = page.waitForResponse(response => {
        const request = response.request();
        try { return isApi(request, 'orders/quote') && request.postDataJSON().voucherCode === code; }
        catch { return false; }
      });
      await page.getByRole('button', { name: 'Áp dụng voucher', exact: true }).click();
      const response = await rejectedQuote;
      assert.equal(response.status(), 409);
      const body = await response.json();
      assert.equal(body.code, expectedCode);
      await page.getByRole('alert').filter({ hasText: expectedError }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Đặt hàng ngay', exact: true }).isDisabled(), true);
      assert.equal(await prisma.phieuXuat.count({ where: { MaKhachHang: customerId } }), 1);
      assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: productId } })).SoLuong, stockBeforeCheckout - 1);
    };
    await rejectVoucher('BROWSER-EXPIRED', 'VOUCHER_EXPIRED', 'Voucher đã hết hạn.');
    await rejectVoucher('BROWSER-MINIMUM', 'VOUCHER_MINIMUM', 'Tiền hàng chưa đạt mức tối thiểu 500.000đ.');

    console.log('Browser: pause voucher without altering the accepted order');
    const validVoucher = await prisma.voucher.findUniqueOrThrow({ where: { Code: 'BROWSER-VALID' } });
    const row = admin.getByRole('row').filter({ hasText: 'BROWSER-VALID' });
    const pausedResponse = admin.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith(`/api/vouchers/${validVoucher.Id}`));
    const pausedRefresh = admin.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/api/vouchers'));
    await row.getByRole('button', { name: 'Ngừng', exact: true }).click();
    assert.equal((await pausedResponse).status(), 200);
    assert.equal((await pausedRefresh).status(), 200);
    await admin.getByText('Đã ngừng voucher; đơn cũ giữ nguyên.', { exact: true }).waitFor();
    const paused = await prisma.voucher.findUniqueOrThrow({ where: { Id: validVoucher.Id } });
    assert.equal(paused.IsActive, false);
    assert.equal(paused.UsedCount, 1);
    const immutableOrder = await prisma.phieuXuat.findUniqueOrThrow({ where: { MaPhieuXuat: order.MaPhieuXuat } });
    assert.equal(immutableOrder.VoucherCode, 'BROWSER-VALID');
    assert.equal(immutableOrder.TongTien, quote.total);
    await admin.screenshot({ path: path.join(directory, 'admin-vouchers-desktop.png'), fullPage: true });
  } catch (error) {
    await page.screenshot({ path: path.join(directory, 'customer-voucher-failure-mobile.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    for (const item of contexts) await item.close();
  }
};
