const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

exports.runReturnsBrowser = async ({ browser, context, admin, adminUrl, base, customerPage, customerUrl, customerId, customerToken, adminToken, productId, orderId, prisma, directory }) => {
  let trackingCode = 'BROWSER-TEST-001';
  const loginCustomer = async () => {
    await customerPage.goto(`${customerUrl}/login`, { waitUntil: 'domcontentloaded' });
    await customerPage.getByPlaceholder('Email hoặc Tên đăng nhập').fill('synthetic@example.invalid');
    await customerPage.getByPlaceholder('Mật khẩu', { exact: true }).fill('NewCustomerPass1!');
    const loginResponse = customerPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/users/login'));
    await customerPage.getByText('ĐĂNG NHẬP', { exact: true }).click();
    assert.equal((await loginResponse).status(), 200, 'return browser customer login succeeds');
    await customerPage.waitForURL(url => url.pathname === '/');
  };
  if (!orderId) {
    trackingCode = 'RET-UI-001';
    const original = await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: productId } });
    const product = await prisma.sanPham.create({ data: { TenSanPham: `Return browser fixture ${Date.now()}`, MaLoaiHang: original.MaLoaiHang,
      MaKho: original.MaKho, MaNCC: original.MaNCC, DonGiaNhap: 50000, DonGiaBan: 120000, SoLuong: 5 } });
    const shipping = { name: 'Return browser customer', phone: '0900000000', address: 'Synthetic return test address' };
    const api = async (route, method = 'GET', body, token) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    };
    const lines = [{ id: product.MaSanPham, quantity: 1 }];
    const quote = await api('/orders/quote', 'POST', { items: lines, shipping }, customerToken);
    assert.equal(quote.status, 200, JSON.stringify(quote.body));
    const checkout = await api('/orders/checkout', 'POST', { items: lines, shipping, paymentMethod: 'COD', requestKey: randomUUID(), quoteHash: quote.body.quoteHash }, customerToken);
    assert.equal(checkout.status, 201, JSON.stringify(checkout.body));
    orderId = checkout.body.order.MaPhieuXuat;
    const transition = (expectedStatus, status, extra = {}) => api(`/orders/${orderId}/status`, 'PUT', { expectedStatus, status, reason: 'Return browser fulfillment', ...extra }, adminToken);
    assert.equal((await transition('PENDING', 'PROCESSING')).status, 200);
    assert.equal((await transition('PROCESSING', 'SHIPPING', { shippingProvider: 'Return UI courier', trackingCode: 'RET-UI-001' })).status, 200);
    assert.equal((await transition('SHIPPING', 'DELIVERED')).status, 200);
    assert.equal((await api(`/orders/${orderId}/status`, 'PUT', { expectedStatus: 'DELIVERED', paymentStatus: 'PAID', reason: 'Return browser COD receipt' }, adminToken)).status, 200);

    await loginCustomer();
    admin = await context.newPage();
    await admin.setViewportSize({ width: 1440, height: 1000 });
    admin.setDefaultTimeout(30000);
    await admin.goto(`${adminUrl}/login`, { waitUntil: 'domcontentloaded' });
    await admin.getByLabel('Tên đăng nhập').fill('test-admin');
    await admin.getByLabel('Mật khẩu', { exact: true }).fill('TestPassword1!');
    await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  }
  const order = await prisma.phieuXuat.findUniqueOrThrow({ where: { MaPhieuXuat: orderId }, include: { ctDonHangs: true } });
  assert.equal(order.TrangThai, 'DELIVERED');
  assert.equal(order.TrangThaiThanhToan, 'PAID');
  const orderLine = order.ctDonHangs[0];

  console.log('Browser: customer submits a return request');
  await loginCustomer();
  const orderLabel = `Đơn #${String(orderId).padStart(5, '0')}`;
  const firstOrdersResponse = customerPage.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname.endsWith('/api/orders/me') && new URL(response.url()).searchParams.get('page') === '1');
  const returnsResponse = customerPage.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname.endsWith('/api/returns/me'));
  await customerPage.goto(`${customerUrl}/orders`, { waitUntil: 'domcontentloaded' });
  assert.equal((await firstOrdersResponse).status(), 200, 'customer order history loaded');
  assert.equal((await returnsResponse).status(), 200, 'customer return history loaded');
  await customerPage.getByText(/^Trang 1\//).waitFor();
  let card = customerPage.getByText(orderLabel, { exact: true }).locator('../..');
  // Other browser modules may place newer synthetic orders ahead of this one.
  // Follow the real customer pagination until the order is on screen.
  for (let page = 1; page < 100 && !(await card.count()); page += 1) {
    const nextPage = customerPage.getByText('Sau →', { exact: true });
    assert.equal(await nextPage.isDisabled(), false, `Delivered order ${orderLabel} was not present in the customer's order history.`);
    const currentLabel = await customerPage.getByText(/^Trang \d+\//).innerText();
    const nextNumber = Number(currentLabel.match(/^Trang (\d+)\//)?.[1] || page) + 1;
    const nextOrdersResponse = customerPage.waitForResponse(response => response.request().method() === 'GET'
      && new URL(response.url()).pathname.endsWith('/api/orders/me') && new URL(response.url()).searchParams.get('page') === String(nextNumber));
    await nextPage.click();
    assert.equal((await nextOrdersResponse).status(), 200, `customer order page ${nextNumber} loaded`);
    await customerPage.getByText(new RegExp(`^Trang ${nextNumber}\\/`)).waitFor();
    card = customerPage.getByText(orderLabel, { exact: true }).locator('../..');
  }
  assert.equal(await card.count(), 1, `Delivered order ${orderLabel} was not present in the customer's paginated order history.`);
  await card.getByText('Đã giao', { exact: true }).waitFor();
  await card.getByText('Xem chi tiết', { exact: true }).click();
  await card.getByText(new RegExp(trackingCode)).waitFor();
  // React Native Web wraps nested Text/View nodes in extra divs, so scope the
  // action by its accessible label after verifying this order is the newest card.
  await customerPage.getByText('Yêu cầu đổi trả', { exact: true }).first().click();
  await customerPage.getByLabel(`Số lượng trả dòng ${orderLine.STT}`).fill('1');
  await customerPage.getByLabel('Lý do đổi trả').fill('Kích thước không vừa');
  const evidenceChooser = customerPage.waitForEvent('filechooser');
  await customerPage.getByText('Chọn ảnh', { exact: true }).click();
  await (await evidenceChooser).setFiles({ name: 'return-proof.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN3cAAAAASUVORK5CYII=', 'base64') });
  const submitted = customerPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/api/returns/orders/${orderId}`));
  const uploadedEvidence = customerPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/evidence'));
  await customerPage.getByText('Gửi yêu cầu', { exact: true }).click();
  assert.equal((await submitted).status(), 201);
  assert.equal((await uploadedEvidence).status(), 201, 'customer evidence upload completed before inspecting the database');
  const created = await prisma.returnRequest.findFirstOrThrow({ where: { OrderId: orderId }, include: { lines: true }, orderBy: { Id: 'desc' } });
  assert.equal(created.Status, 'REQUESTED');
  assert.equal(created.lines[0].RequestedQty, 1);
  assert.equal(Array.isArray(created.Evidence) && created.Evidence.length, 1, 'customer image was uploaded to the private evidence store');
  await customerPage.getByText('Chờ cửa hàng duyệt', { exact: false }).first().waitFor();
  const customerImageResponse = customerPage.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes(`/api/returns/${created.Id}/evidence/`));
  await customerPage.getByText('Xem ảnh minh chứng', { exact: true }).click();
  assert.equal((await customerImageResponse).status(), 200);
  await customerPage.getByRole('img', { name: 'Ảnh minh chứng đổi trả' }).waitFor();
  await customerPage.getByLabel('Đóng ảnh minh chứng').click();
  await customerPage.getByRole('img', { name: 'Ảnh minh chứng đổi trả' }).waitFor({ state: 'detached' });
  await card.screenshot({ path: path.join(directory, 'customer-return-request-mobile.png') });

  console.log('Browser: admin receives, inspects and reconciles the return');
  await admin.getByRole('button', { name: 'Đổi trả & Hoàn tiền', exact: true }).click();
  await admin.getByRole('heading', { name: 'Đổi trả & hoàn tiền', exact: true }).waitFor();
  const row = admin.getByRole('row').filter({ hasText: `#${created.Id} · đơn #${orderId}` });
  await row.getByRole('button', { name: 'Xem & xử lý', exact: true }).click();
  let dialog = admin.getByRole('dialog');
  const adminImageResponse = admin.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes(`/api/returns/${created.Id}/evidence/`));
  await dialog.getByRole('img', { name: /Ảnh minh chứng đổi trả/ }).waitFor();
  assert.equal((await adminImageResponse).status(), 200);
  const reason = () => dialog.getByPlaceholder(/^Ví dụ:/);
  await reason().fill('Hàng nguyên tem, khách gửi đúng dòng đã mua');
  await dialog.getByRole('button', { name: 'Duyệt nhận trả', exact: true }).click();
  await dialog.getByRole('button', { name: 'Xác nhận đã nhận hàng', exact: true }).waitFor();
  await reason().fill('Đã tiếp nhận hàng tại kho');
  await dialog.getByRole('button', { name: 'Xác nhận đã nhận hàng', exact: true }).click();
  const inspectButton = dialog.getByRole('button', { name: 'Hoàn tất kiểm tra & cập nhật tồn', exact: true });
  // Wait for the transition response/reloaded state. The received-quantity
  // field can still be present briefly while the APPROVED form is closing.
  await inspectButton.waitFor();
  const saleableQuantity = dialog.getByLabel(`Số lượng đủ bán dòng ${created.lines[0].Id}`);
  await saleableQuantity.waitFor();
  const stockBeforeInspection = (await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: orderLine.MaSanPham } })).SoLuong;
  await saleableQuantity.fill('1');
  await reason().fill('Kiểm tra hàng còn nguyên tem và chưa qua sử dụng');
  const inspectionResponse = admin.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith(`/api/returns/${created.Id}/status`));
  await inspectButton.click();
  const inspected = await inspectionResponse;
  const inspectedBody = await inspected.json();
  assert.equal(inspected.status(), 200, JSON.stringify(inspectedBody));
  assert.equal(inspectedBody.request.refundDue, 120000);
  await dialog.getByRole('button', { name: 'Ghi nhận hoàn tiền', exact: true }).waitFor();
  assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: orderLine.MaSanPham } })).SoLuong, stockBeforeInspection + 1);
  assert.equal(await prisma.dieuChinhTonKho.count({ where: { MaSanPham: orderLine.MaSanPham, Loai: 'RETURN_RESTOCK' } }), 1);
  await dialog.getByLabel('Mã giao dịch / biên nhận').fill('BROWSER-REFUND-001');
  const refund = admin.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/api/returns/${created.Id}/refund`));
  const refreshedDetail = admin.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/api/returns/${created.Id}`));
  await dialog.getByRole('button', { name: 'Ghi nhận hoàn tiền', exact: true }).click();
  assert.equal((await refund).status(), 201);
  assert.equal((await refreshedDetail).status(), 200, 'admin details are reloaded after recording the refund');
  await admin.getByRole('status').getByText('Đã ghi nhận giao dịch hoàn tiền.', { exact: true }).waitFor();
  await dialog.getByText(/Đã hoàn tiền.*REFUNDED/).waitFor();
  assert.match(await dialog.innerText(), /REFUNDED/, 'admin return details show the reconciled payment state');
  const completed = await prisma.returnRequest.findUniqueOrThrow({ where: { Id: created.Id } });
  assert.equal(completed.Status, 'REFUNDED');
  const [refundedOrder, refundLedger] = await Promise.all([
    prisma.phieuXuat.findUniqueOrThrow({ where: { MaPhieuXuat: orderId } }),
    prisma.returnRefund.aggregate({ where: { ReturnId: created.Id }, _sum: { Amount: true } }),
  ]);
  const refundedAmount = Number(refundLedger._sum.Amount || 0);
  const orderTotal = Number(refundedOrder.TongTien);
  assert.ok(refundedAmount <= orderTotal, 'refund ledger cannot exceed the collected order amount');
  assert.equal(refundedOrder.TrangThaiThanhToan, refundedAmount >= orderTotal ? 'REFUNDED' : 'PARTIALLY_REFUNDED');
  await admin.screenshot({ path: path.join(directory, 'admin-return-refunded.png'), fullPage: true });
};
