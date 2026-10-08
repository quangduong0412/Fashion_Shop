const assert = require('node:assert/strict');
const path = require('node:path');

exports.runShoppingBrowser = async ({ browser, customerUrl, base, prisma, directory, routeApi, errors }) => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/fashionhaven_test_\d+_[a-f0-9]{8}$/);
  const contexts=[];
  const createPage=async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
    context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
    await context.route('**/api/**',routeApi);
    const page=await context.newPage();page.setDefaultTimeout(30000);return page;
  };
  const register=async(email)=>{
    const response=await fetch(base+'/users/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Browser shopping customer',email,password:'BrowserShopping1!'})});
    assert.equal(response.status,201);return (await response.json()).user.id;
  };
  const login=async(page,email)=>{
    await page.goto(`${customerUrl}/login?returnTo=/cart`,{waitUntil:'domcontentloaded'});
    await page.getByPlaceholder('Email hoặc Tên đăng nhập').fill(email);
    await page.getByPlaceholder('Mật khẩu',{exact:true}).fill('BrowserShopping1!');
    await page.getByText('ĐĂNG NHẬP',{exact:true}).click();await page.waitForURL(/\/cart$/);
  };
  const a=await register('browser-shopping-a@example.invalid'),b=await register('browser-shopping-b@example.invalid');
  const source=await prisma.sanPham.findFirstOrThrow();
  const category=await prisma.loaiHang.create({data:{TenLoaiHang:'Browser shopping category'}});
  const product=await prisma.sanPham.create({data:{TenSanPham:'Browser shopping garment',MaLoaiHang:category.MaLoaiHang,MaKho:source.MaKho,MaNCC:source.MaNCC,DonGiaNhap:0,DonGiaBan:900000,SoLuong:10,ThuongHieu:'Browser shopping brand',bienThes:{create:[
    {SKU:'BROWSER-SHOP-M',KichCo:'M',MauSac:'Đen',DonGia:120000,SoLuong:5},
    {SKU:'BROWSER-SHOP-L',KichCo:'L',MauSac:'Trắng',DonGia:240000,SoLuong:5}
  ]}},include:{bienThes:true}});
  let page;
  try {
    console.log('Browser: guest cart merge, wishlist and matching SKU filters');
    page=await createPage();
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`,{waitUntil:'domcontentloaded'});
    await page.getByText('Thêm vào giỏ',{exact:true}).click();
    await page.getByText('Đã thêm sản phẩm vào giỏ hàng.',{exact:true}).waitFor();
    await login(page,'browser-shopping-a@example.invalid');
    await page.getByText('Browser shopping garment',{exact:true}).waitFor();
    let stored=await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:a}});
    assert.equal(stored.Items.length,1);assert.equal(stored.Items[0].quantity,1);
    await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Browser shopping garment',{exact:true}).waitFor();
    assert.equal((await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:a}})).Items[0].quantity,1);
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Yêu thích Browser shopping garment',exact:true}).click();
    await page.getByRole('button',{name:'Bỏ yêu thích Browser shopping garment',exact:true}).waitFor();
    await page.goto(`${customerUrl}/wishlist`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Xem yêu thích Browser shopping garment',exact:true}).waitFor();
    assert.equal(await prisma.customerWishlist.count({where:{CustomerId:a,ProductId:product.MaSanPham}}),1);
    await page.screenshot({path:path.join(directory,'customer-wishlist-mobile.png'),fullPage:true});
    await page.goto(`${customerUrl}/explore`,{waitUntil:'domcontentloaded'});
    await page.getByLabel('Tìm sản phẩm',{exact:true}).fill('Browser shopping garment');
    await page.getByRole('button',{name:'Lọc & sắp xếp',exact:true}).click();
    await page.getByRole('button',{name:'Size L',exact:true}).click();
    await page.getByRole('button',{name:'Màu Đen',exact:true}).click();
    await page.getByRole('button',{name:'Áp dụng bộ lọc',exact:true}).click();
    await page.getByText('Không có sản phẩm phù hợp.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Lọc & sắp xếp',exact:true}).click();
    await page.getByRole('button',{name:'Size M',exact:true}).click();
    await page.getByLabel('Giá tối đa',{exact:true}).fill('150000');
    await page.getByRole('button',{name:'Áp dụng bộ lọc',exact:true}).click();
    await page.getByRole('button',{name:'Xem Browser shopping garment',exact:true}).waitFor();
    await page.getByText('120.000đ',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
    await page.screenshot({path:path.join(directory,'customer-filtered-catalog-mobile.png'),fullPage:true});

    console.log('Browser: SKU change and cart shared with a second device');
    await page.goto(`${customerUrl}/cart`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Đổi biến thể Browser shopping garment',exact:true}).click();
    await page.getByRole('button',{name:'Chọn SKU BROWSER-SHOP-L',exact:true}).click();
    const retained=page.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment L Trắng/});
    await retained.waitFor();await retained.click();
    await page.waitForFunction(()=>document.querySelector('[aria-label^="Thanh toán Browser shopping garment L Trắng"]')?.getAttribute('aria-checked')==='false');
    const device=await createPage();await login(device,'browser-shopping-a@example.invalid');
    await device.getByText('Browser shopping garment',{exact:true}).waitFor();
    assert.equal(await device.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment L Trắng/}).isChecked(),false);
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`,{waitUntil:'domcontentloaded'});
    await page.getByText('Thêm vào giỏ',{exact:true}).click();await page.getByText('Đã thêm sản phẩm vào giỏ hàng.',{exact:true}).waitFor();
    await page.goto(`${customerUrl}/cart`,{waitUntil:'domcontentloaded'});
    await page.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment M Đen/}).waitFor();
    assert.equal(await page.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment L Trắng/}).isChecked(),false);

    console.log('Browser: saved recipient checkout and immutable address snapshot');
    await page.goto(`${customerUrl}/addresses`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Thêm địa chỉ',exact:true}).click();
    await page.getByLabel('Tên địa chỉ',{exact:true}).fill('Nhà thử nghiệm');
    await page.getByLabel('Người nhận lưu',{exact:true}).fill('Browser saved recipient');
    await page.getByLabel('Điện thoại lưu',{exact:true}).fill('0900000000');
    await page.getByLabel('Địa chỉ đầy đủ',{exact:true}).fill('Browser saved synthetic address');
    await page.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();
    await page.getByText('Đã lưu địa chỉ.',{exact:true}).waitFor();
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:path.join(directory,'customer-addresses-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    const address=await prisma.customerAddress.findFirstOrThrow({where:{CustomerId:a,IsDefault:true}});
    await page.goto(`${customerUrl}/cart`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Giao đến Nhà thử nghiệm',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Địa chỉ nhận hàng',{exact:true}).inputValue(),address.Address);
    // Lose the response only after the real API has committed. The app must retain and replay its key.
    let loseCheckoutResponse=true;
    await page.context().route('**/api/orders/checkout',async route=>{
      if(loseCheckoutResponse){
        const response=await route.fetch({url:base+'/orders/checkout'});
        assert.equal(response.status(),201);loseCheckoutResponse=false;
        await route.abort('connectionfailed');
      }else await routeApi(route);
    });
    const submitted=page.waitForRequest(req=>req.url().includes('/api/orders/checkout')&&req.method()==='POST');
    await page.getByText('Đặt hàng COD',{exact:true}).click();
    const payload=(await submitted).postDataJSON();assert.equal(payload.addressId,address.Id);assert.ok(payload.cartVersion>0);assert.equal(payload.items.length,1);
    await page.getByText('Kiểm tra yêu cầu đặt hàng',{exact:true}).waitFor();
    const replayRequest=page.waitForRequest(req=>req.url().includes('/api/orders/checkout')&&req.method()==='POST');
    await page.getByText('Kiểm tra yêu cầu đặt hàng',{exact:true}).click();
    assert.deepEqual((await replayRequest).postDataJSON(),payload);
    await page.waitForURL(/\/orders$/);
    const order=await prisma.phieuXuat.findFirstOrThrow({where:{MaKhachHang:a},orderBy:{MaPhieuXuat:'desc'}});
    assert.equal(await prisma.phieuXuat.count({where:{MaKhachHang:a}}),1);
    assert.equal(order.DiaChiNhan,address.Address);assert.equal(Number(order.TienHang),120000);assert.equal(order.TongTien,Number(order.TienHang)+Number(order.PhiGiaoHang)-Number(order.GiamGiaDon));
    await device.reload({waitUntil:'domcontentloaded'});await device.getByText('Browser shopping garment',{exact:true}).waitFor();
    assert.equal(await device.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment L Trắng/}).isChecked(),false);
    assert.equal(await device.getByRole('checkbox',{name:/^Thanh toán Browser shopping garment M Đen/}).count(),0);
    await page.goto(`${customerUrl}/addresses`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Sửa địa chỉ Nhà thử nghiệm',exact:true}).click();
    await page.getByLabel('Địa chỉ đầy đủ',{exact:true}).fill('Browser changed after checkout');
    await page.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();await page.getByText('Đã lưu địa chỉ.',{exact:true}).waitFor();
    assert.equal((await prisma.phieuXuat.findUniqueOrThrow({where:{MaPhieuXuat:order.MaPhieuXuat}})).DiaChiNhan,address.Address);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
    await page.screenshot({path:path.join(directory,'customer-addresses-mobile.png'),fullPage:true});

    console.log('Browser: unavailable favorites and account isolation after logout');
    await prisma.sanPham.update({where:{MaSanPham:product.MaSanPham},data:{TrangThai:'Tạm ngừng'}});
    await page.goto(`${customerUrl}/wishlist`,{waitUntil:'domcontentloaded'});
    await page.getByText('Sản phẩm hiện không còn hiển thị',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Xem yêu thích Browser shopping garment',exact:true}).count(),0);
    await page.getByRole('button',{name:'Bỏ lưu Browser shopping garment',exact:true}).click();
    await page.getByText(/Chưa có sản phẩm yêu thích/).waitFor();
    await page.goto(`${customerUrl}/profile`,{waitUntil:'domcontentloaded'});
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.waitForURL(url=>url.pathname==='/');
    await page.goto(`${customerUrl}/cart`,{waitUntil:'domcontentloaded'});await page.getByText('Giỏ hàng đang trống',{exact:true}).waitFor();
    await login(page,'browser-shopping-b@example.invalid');await page.getByText('Giỏ hàng đang trống',{exact:true}).waitFor();
    assert.equal(await prisma.customerCart.count({where:{CustomerId:b}}),0);
    assert.equal((await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:a}})).Items.length,1);
    await page.screenshot({path:path.join(directory,'customer-other-account-cart-mobile.png'),fullPage:true});

    console.log('Browser: rejected guest merge preserves account cart and offers explicit discard');
    await prisma.sanPham.update({where:{MaSanPham:product.MaSanPham},data:{TrangThai:'Đang mở bán'}});
    await page.goto(`${customerUrl}/product/${product.MaSanPham}`,{waitUntil:'domcontentloaded'});
    await page.getByText('Thêm vào giỏ',{exact:true}).click();await page.getByText('Đã thêm sản phẩm vào giỏ hàng.',{exact:true}).waitFor();
    const before=await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:b}});
    const stale=await prisma.sanPham.create({data:{TenSanPham:'Browser stale guest item',MaLoaiHang:category.MaLoaiHang,MaKho:source.MaKho,MaNCC:source.MaNCC,DonGiaNhap:0,DonGiaBan:10000,SoLuong:1}});
    const guest=await createPage();
    await guest.goto(`${customerUrl}/product/${stale.MaSanPham}`,{waitUntil:'domcontentloaded'});
    await guest.getByText('Thêm vào giỏ',{exact:true}).click();await guest.getByText('Đã thêm sản phẩm vào giỏ hàng.',{exact:true}).waitFor();
    await prisma.sanPham.update({where:{MaSanPham:stale.MaSanPham},data:{SoLuong:0}});
    await login(guest,'browser-shopping-b@example.invalid');
    await guest.getByText(/Giỏ khách chưa hợp nhất:/).filter({visible:true}).first().waitFor();
    await guest.getByText('Browser shopping garment',{exact:true}).waitFor();
    assert.deepEqual((await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:b}})).Items,before.Items);
    await guest.getByRole('button',{name:'Bỏ phần giỏ khách chưa hợp nhất',exact:true}).click();
    await guest.getByText('Đã bỏ giỏ khách chưa hợp nhất. Giỏ tài khoản vẫn được giữ.',{exact:true}).filter({visible:true}).waitFor();
    assert.deepEqual((await prisma.customerCart.findUniqueOrThrow({where:{CustomerId:b}})).Items,before.Items);
    assert.equal(await guest.evaluate(id=>Object.keys(localStorage).filter(key=>key.startsWith(`guest_merge_${id}_`)).length,b),0);
    await guest.screenshot({path:path.join(directory,'customer-rejected-guest-merge-mobile.png'),fullPage:true});
  } catch(error){if(page)await page.screenshot({path:path.join(directory,'shopping-browser-failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{await prisma.sanPham.update({where:{MaSanPham:product.MaSanPham},data:{TrangThai:'Đang mở bán'}});for(const context of contexts)await context.close();}
};
