import type { Prisma } from '@prisma/client';
import { ApiError } from './apiErrors';
import { isPasswordHash, newPassword } from './credentials';
import { lockLoginNamespace } from './loginNamespace';
import { recordStockAdjustment } from './inventoryAdjustments';
import { adjustOrderInventory } from './orderInventory';
import { assertTransition, money, type OrderStatus } from './orderRules';
import { cartInput, checkoutContext, hash, quoteCheckout } from './checkout';
import { consumeVoucher, releaseVoucherForCancelledOrder } from './vouchers';
import { defaultSettings, validateSettings } from './storeSettings';

export const demoDatabaseName = 'fashionhaven_demo_v1';
export const demoProject = 'fashion-haven-demo-v1';
export const demoSize = 65;

// The target is deliberately separate from DATABASE_URL. Never rewrite a shop database.
export function demoTarget(env: NodeJS.ProcessEnv) {
  let source: URL;
  try { source = new URL(env.DATABASE_URL ?? ''); } catch { throw new ApiError(400, 'DEMO_DATABASE_UNSAFE', 'Cần DATABASE_URL MySQL local hợp lệ.'); }
  if (source.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname) || !source.pathname.slice(1) || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(source.pathname.slice(1).toLowerCase()) || source.search || source.hash || /^fashionh(?:aven|eaven)_test_/i.test(source.pathname.slice(1))) throw new ApiError(400, 'DEMO_DATABASE_UNSAFE', 'Bộ demo chỉ dùng MySQL local ngoài database hệ thống/test.');
  if (source.pathname.slice(1).toLowerCase() === demoDatabaseName) throw new ApiError(400, 'DEMO_DATABASE_UNSAFE', 'DATABASE_URL phải giữ database ứng dụng gốc; bộ demo dùng kết nối riêng.');
  const target = new URL(source); target.pathname = `/${demoDatabaseName}`;
  return { source: source.toString(), target: target.toString(), database: demoDatabaseName };
}
export function demoWriteConfig(env: NodeJS.ProcessEnv) {
  const target = demoTarget(env);
  if (env.NODE_ENV !== 'development' || env.ALLOW_DEMO_DATA !== 'true') throw new ApiError(400, 'DEMO_DISABLED', 'Cần NODE_ENV=development và ALLOW_DEMO_DATA=true để tạo bộ demo.');
  return { ...target, password: newPassword(env.DEMO_DATA_PASSWORD) };
}

export const demoPlan = {
  database: demoDatabaseName, recordsPerEntity: demoSize,
  entities: ['danh mục', 'chức danh', 'chi nhánh', 'kho', 'nhà cung cấp', 'nhân viên', 'tài khoản nhân viên', 'khách hàng', 'sản phẩm', 'địa chỉ', 'yêu thích', 'giỏ hàng', 'bài viết', 'liên hệ', 'yêu cầu nhập', 'phiếu nhập', 'đơn hàng', 'biên nhận checkout', 'voucher', 'lượt dùng voucher'],
  derived: { variants: demoSize * 4, importLines: demoSize * 3, orderLines: demoSize },
  exceptions: ['Cài đặt chỉ có 1 bản ghi, tối đa 5 banner theo hợp đồng hiện tại.', 'Nhật ký phát sinh theo sự kiện thực thi mô phỏng; không ép số lượng theo dữ liệu mẫu.', 'Không tạo reset token/session, khóa kỹ thuật, sysdiagrams hoặc bảng tính năng chưa triển khai.'],
  credentials: `demo.admin@example.invalid; demo.staff002..${String(demoSize).padStart(3, '0')}@example.invalid; demo.customer001..${String(demoSize).padStart(3, '0')}@example.invalid. Mật khẩu do người vận hành đặt qua DEMO_DATA_PASSWORD local.`,
  safety: 'Database demo riêng, không sao chép dữ liệu cá nhân, không gửi email, không thực hiện thanh toán thật; không reset hoặc ghi đè database đã có.'
};

const categories = ['Áo thun', 'Áo sơ mi', 'Áo polo', 'Áo khoác', 'Áo len', 'Áo cardigan', 'Áo blazer', 'Áo vest', 'Áo hoodie', 'Áo sweatshirt', 'Áo sát nách', 'Áo dài', 'Áo kiểu', 'Áo croptop', 'Áo giữ nhiệt', 'Quần jeans', 'Quần tây', 'Quần kaki', 'Quần jogger', 'Quần short', 'Quần legging', 'Quần culottes', 'Quần ống rộng', 'Quần thể thao', 'Quần yếm', 'Chân váy chữ A', 'Chân váy xếp ly', 'Chân váy bút chì', 'Chân váy midi', 'Chân váy denim', 'Đầm suông', 'Đầm công sở', 'Đầm dự tiệc', 'Đầm maxi', 'Đầm sơ mi', 'Bộ mặc nhà', 'Bộ thể thao', 'Bộ công sở', 'Bộ đồ len', 'Đồ bơi', 'Giày sneaker', 'Giày loafer', 'Giày cao gót', 'Giày boots', 'Giày sandal', 'Dép thời trang', 'Túi đeo vai', 'Túi đeo chéo', 'Túi tote', 'Balo', 'Ví', 'Thắt lưng', 'Khăn choàng', 'Mũ lưỡi trai', 'Mũ bucket', 'Mũ len', 'Tất', 'Găng tay', 'Kính thời trang', 'Phụ kiện tóc', 'Túi clutch', 'Túi du lịch', 'Vòng tay', 'Dây chuyền', 'Bông tai'];
const suffix = (index: number) => String(index + 1).padStart(3, '0');
export type DemoManifest = { version: 1; project: string; createdAt: string; ids: Record<string, number[]>; counts: Record<string, number> };

// Domain operation for a NEW, isolated demo database. The CLI checks ownership/emptiness.
// One transaction contains the complete dataset and its completion receipt. No partial records.
export async function createDemoDataset(tx: Prisma.TransactionClient, passwordHashes: string[]): Promise<DemoManifest> {
  if (passwordHashes.length !== demoSize * 2 || passwordHashes.some(h => !isPasswordHash(h))) throw new ApiError(400, 'INVALID_DEMO_CREDENTIALS', 'Cần hash riêng cho từng tài khoản demo.');
  await lockLoginNamespace(tx);
  const ids: Record<string, number[]> = {};
  const track = (entity: string, id: number) => { (ids[entity] ??= []).push(id); return id; };
  const settings = validateSettings({ ...defaultSettings, storeName: 'Fashion Haven · DEMO', contactEmail: 'demo.support@example.invalid', address: 'Môi trường trình diễn — dữ liệu tổng hợp', shippingPolicy: 'DEMO: giao tiêu chuẩn 30.000đ mỗi checkout; miễn phí từ 500.000đ.', returnPolicy: 'DEMO: liên hệ hỗ trợ. Quy trình đổi trả tự phục vụ chưa triển khai.', shipping: { enabled: true, label: 'Giao tiêu chuẩn (DEMO)', fee: 30_000, freeFrom: 500_000 }, banners: [{ id: 'demo-intro', title: 'Bộ sưu tập trình diễn', subtitle: 'Dữ liệu và hình minh họa demo, không phải hàng thật.', image: '/images/demo-catalog.png', link: '/products', buttonText: 'Khám phá', isActive: true, startsAt: null, endsAt: null }] });
  await tx.storeSettings.create({ data: { Id: 1, Value: settings as Prisma.InputJsonValue } });
  let adminId = 0;
  for (let index = 0; index < demoSize; index++) {
    const number = suffix(index), categoryName = categories[index]!;
    const sizes = index < 40 ? ['S', 'M', 'L', 'XL'] : index < 46 ? ['38', '39', '40', '41'] : ['ONE', 'ONE', 'ONE', 'ONE'];
    const category = await tx.loaiHang.create({ data: { TenLoaiHang: `[DEMO] ${categoryName}`, Position: index, Anh: '/images/demo-catalog.png', Icon: index<15?'shirt':index<25?'pants':index<30?'skirt':index<35?'dress':index<40?'sport':index<46?'shoes':index<51?'bag':index<56?'hat':'accessories', ThuocTinhBienThe: [{ key: 'size', label: 'Kích cỡ', type: 'select', required: true, options: [...new Set(sizes)] }, { key: 'edition', label: 'Phiên bản demo', type: 'select', required: true, options: ['1', '2', '3', '4'] }] } }); track('categories', category.MaLoaiHang);
    const job = await tx.chucVu.create({ data: { TenChucVu: `[DEMO] ${['Quản lý', 'Bán hàng', 'Kho'][index % 3]} ${number}` } }); track('jobs', job.MaChucVu);
    const branch = await tx.chiNhanh.create({ data: { TenChiNhanh: `[DEMO] Chi nhánh ${number}`, DiaChi: `Địa chỉ mô phỏng ${number}, không dùng để giao thực tế`, DienThoai: '0900000000' } }); track('branches', branch.MaChiNhanh);
    const warehouse = await tx.kho.create({ data: { TenKho: `[DEMO] Kho ${number}`, DiaChi: `Kho mô phỏng ${number}` } }); track('warehouses', warehouse.MaKho);
    const supplier = await tx.nhaCungCap.create({ data: { TenNCC: `[DEMO] Nhà cung cấp ${number}`, DiaChi: 'Dữ liệu tổng hợp', DienThoai: '0900000000' } }); track('suppliers', supplier.MaNCC);
    const employee = await tx.nhanVien.create({ data: { TenNhanVien: `[DEMO] Nhân viên ${number}`, MaChucVu: job.MaChucVu, MaChiNhanh: branch.MaChiNhanh, account: { create: { UserName: index === 0 ? 'demo.admin@example.invalid' : `demo.staff${number}@example.invalid`, PassWord: passwordHashes[index]!, Role: index === 0 ? 'ADMIN' : 'STAFF' } } } }); track('employees', employee.MaNhanVien); track('staffAccounts', employee.MaNhanVien);
    if (!index) adminId = employee.MaNhanVien;
    const customer = await tx.khachHang.create({ data: { TenKhach: `[DEMO] Khách hàng ${number}`, Email: `demo.customer${number}@example.invalid`, MatKhau: passwordHashes[demoSize + index]!, HangThanhVien: 'Thành viên mới', DienThoai: '0900000000' } }); track('customers', customer.MaKhachHang);
    await tx.customerAudit.create({ data: { CustomerId: customer.MaKhachHang, ActorId: adminId, ActorRole: 'admin', Action: 'DEMO_PROVISION', Note: 'Dữ liệu tổng hợp trong database demo riêng; không đặt lại tài khoản cũ.' } });
    const address = await tx.customerAddress.create({ data: { CustomerId: customer.MaKhachHang, Label: 'Địa chỉ DEMO', Name: customer.TenKhach, Phone: '0900000000', Address: branch.DiaChi, IsDefault: true } }); track('addresses', address.Id);
    const price = 99_000 + index * 5_000;
    const product = await tx.sanPham.create({ data: { TenSanPham: `[DEMO] ${categoryName} ${number}`, MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho, MaNCC: supplier.MaNCC, SoLuong: 0, DonGiaNhap: 50_000, DonGiaBan: price, Anh: '/images/demo-catalog.png', Gallery: [{ url: '/images/demo-catalog.png', alt: 'Minh họa DEMO, không phải ảnh hàng thật' }], ChatLieu: 'Mô tả chất liệu mẫu; cần xác minh khi bán thật', ThuongHieu: `Fashion Haven Demo ${index % 6 + 1}`, GhiChu: 'Sản phẩm tổng hợp để trình diễn. Ảnh là minh họa trung tính, không đại diện cho hàng thực. Giá/tồn chỉ có giá trị trong môi trường demo.', bienThes: { create: Array.from({ length: 4 }, (_, variant) => ({ SKU: `FHDEMO-${number}-${variant + 1}`, KichCo: sizes[variant]!, MauSac: variant % 2 ? 'Trắng' : 'Đen', ThuocTinh: { size: sizes[variant]!, edition: String(variant + 1) }, DonGia: price + variant * 2_000, Anh: '/images/demo-catalog.png', SoLuong: 0 })) } }, include: { bienThes: { orderBy: { MaBienThe: 'asc' } } } }); track('products', product.MaSanPham);
    product.bienThes.forEach(v => track('variants', v.MaBienThe));
    // Receipt is created as DRAFT. Only its simulated receipt adds stock, with an audit per SKU.
    const quantities = [20, 12, 6];
    const receipt = await tx.phieuNhap.create({ data: { MaNhanVien: adminId, MaNCC: supplier.MaNCC, MaKho: warehouse.MaKho, TrangThai: 'DRAFT', TongTien: money(38 * 50_000), ctPhieuNhaps: { create: product.bienThes.slice(0, 3).map((v, vi) => ({ MaSanPham: product.MaSanPham, MaBienThe: v.MaBienThe, SKU: v.SKU, KichCo: v.KichCo, MauSac: v.MauSac, TenSanPham: product.TenSanPham, SoLuong: quantities[vi]!, DonGiaNhap: 50_000, ThanhTien: money(quantities[vi]! * 50_000) })) } }, include: { ctPhieuNhaps: true } }); track('imports', receipt.MaPhieuNhap); receipt.ctPhieuNhaps.forEach(l => track('importLines', l.STT));
    for (const [vi, v] of product.bienThes.slice(0, 3).entries()) {
      const quantity = quantities[vi]!;
      await tx.bienTheSanPham.update({ where: { MaBienThe: v.MaBienThe }, data: { SoLuong: quantity } });
      await recordStockAdjustment(tx, { productId: product.MaSanPham, variantId: v.MaBienThe, sku: v.SKU, variantName: `${v.KichCo} · ${v.MauSac}`, before: 0, after: quantity, kind: 'RECEIPT', actor: `admin:${adminId}`, reason: `DEMO: nhận phiếu #${receipt.MaPhieuNhap}, không phải nhập hàng thật.` });
    }
    await tx.sanPham.update({ where: { MaSanPham: product.MaSanPham }, data: { SoLuong: 38 } });
    await tx.phieuNhap.update({ where: { MaPhieuNhap: receipt.MaPhieuNhap }, data: { TrangThai: 'RECEIVED', NguoiXuLy: adminId, NgayXuLy: new Date(), LyDoXuLy: 'DEMO: mô phỏng thực nhận trong database riêng.' } });
    const promotion = await tx.voucher.create({data:{Code:`DEMO${number}`,Type:index%2?'PERCENT':'FIXED',Value:index%2?10:10000,MaxDiscount:index%2?30000:null,MinSubtotal:0,StartsAt:new Date(Date.now()-3600000),EndsAt:new Date(Date.now()+90*86400000),TotalLimit:200,PerCustomerLimit:1,Scope:'ALL',ScopeIds:[]}});track('vouchers',promotion.Id);
    await tx.voucherAudit.create({data:{VoucherId:promotion.Id,ActorId:adminId,Version:1,Action:'CREATE'}});
    const first = product.bienThes[0]!;
    await tx.customerWishlist.create({ data: { CustomerId: customer.MaKhachHang, ProductId: product.MaSanPham, Name: product.TenSanPham, Image: product.Anh } });
    track('wishlists', customer.MaKhachHang);
    await tx.customerCart.create({ data: { CustomerId: customer.MaKhachHang, Items: [{ id: product.MaSanPham, variantId: product.bienThes[1]!.MaBienThe, quantity: 1, selected: false, name: product.TenSanPham, image: product.Anh }] } });
    track('carts', customer.MaKhachHang);
    const items = cartInput([{ id: product.MaSanPham, variantId: first.MaBienThe, quantity: 1 }]);
    const context = checkoutContext({ voucherCode: promotion.Code, paymentMethod: 'COD', shipping: { name: address.Name, phone: address.Phone, address: address.Address }, note: 'DEMO: đơn mô phỏng; không gửi hàng/thu tiền thật.' });
    const quote = await quoteCheckout(tx, items, context, customer.MaKhachHang, true);
    const line = quote.lines[0]!;
    const order = await tx.phieuXuat.create({ data: { MaNhanVien: adminId, MaKhachHang: customer.MaKhachHang, MaKho: warehouse.MaKho, TongTien: quote.total, TienHang: quote.subtotal, GiamGiaDon: quote.discount, VoucherCode:promotion.Code, VoucherSnapshot:quote.snapshot as unknown as Prisma.InputJsonValue, PhiGiaoHang: quote.shippingFee, ShippingMethod: context.shippingMethod, ShippingLabel: quote.shippingLabel, GhiChuDonHang: context.note, TrangThai: 'PENDING', PhuongThucThanhToan: 'COD', TrangThaiThanhToan: 'UNPAID', TenNguoiNhan: address.Name, DienThoaiNhan: address.Phone, DiaChiNhan: address.Address, ctDonHangs: { create: { MaSanPham: product.MaSanPham, MaBienThe: first.MaBienThe, SKU: first.SKU, KichCo: first.KichCo, MauSac: first.MauSac, ThuocTinh: first.ThuocTinh as Prisma.InputJsonValue, TenSanPham: product.TenSanPham, AnhSanPham: product.Anh, SoLuong: 1, DonGiaBan: line.price, GiamGiaDong:quote.discount, ThanhTien:money(line.total-quote.discount) } } }, include: { ctDonHangs: true } }); track('orders', order.MaPhieuXuat); order.ctDonHangs.forEach(l => track('orderLines', l.STT));
    await adjustOrderInventory(tx, order.ctDonHangs, false, `user:${customer.MaKhachHang}`, order.MaPhieuXuat);
    await tx.orderEvent.create({ data: { OrderId: order.MaPhieuXuat, ToStatus: 'PENDING', ToPayment: 'UNPAID', ActorRole: 'user', ActorId: customer.MaKhachHang, Note: context.note } });
    await consumeVoucher(tx,quote,customer.MaKhachHang,`demo_checkout_${number}`,[order.MaPhieuXuat]);track('voucherUsages',customer.MaKhachHang);
    const final: OrderStatus = ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'][index % 5] as OrderStatus;
    const path: OrderStatus[] = final === 'CANCELLED' ? ['CANCELLED'] : ['PROCESSING', 'SHIPPING', 'DELIVERED'].slice(0, ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED'].indexOf(final)) as OrderStatus[];
    let from: OrderStatus = 'PENDING';
    for (const to of path) {
      assertTransition(from, to);
      if (to === 'CANCELLED') await adjustOrderInventory(tx, order.ctDonHangs, true, `admin:${adminId}`, order.MaPhieuXuat);
      await tx.phieuXuat.update({ where: { MaPhieuXuat: order.MaPhieuXuat }, data: { TrangThai: to, ...(to === 'SHIPPING' ? { DonViVanChuyen: 'Vận chuyển DEMO', MaVanDon: `DEMO-${number}` } : {}) } });
      if(to==='CANCELLED') await releaseVoucherForCancelledOrder(tx,order.MaPhieuXuat,customer.MaKhachHang);
      await tx.orderEvent.create({ data: { OrderId: order.MaPhieuXuat, FromStatus: from, ToStatus: to, FromPayment: 'UNPAID', ToPayment: 'UNPAID', ActorRole: 'admin', ActorId: adminId, Note: 'DEMO: mô phỏng trạng thái, không gọi nhà vận chuyển.' } }); from = to;
    }
    // A deliberately labelled simulated COD reconciliation, never an external money transfer.
    if (final === 'DELIVERED' && index % 2) {
      await tx.phieuXuat.update({ where: { MaPhieuXuat: order.MaPhieuXuat }, data: { TrangThaiThanhToan: 'PAID' } });
      await tx.orderEvent.create({ data: { OrderId: order.MaPhieuXuat, FromStatus: final, ToStatus: final, FromPayment: 'UNPAID', ToPayment: 'PAID', ActorRole: 'admin', ActorId: adminId, Note: `DEMO-RECONCILE-${number}: dữ liệu mô phỏng, không có tiền thực thu.` } });
    }
    await tx.checkoutRequest.create({ data: { CustomerId: customer.MaKhachHang, Key: `demo_checkout_${number}`, Fingerprint: hash({ items, ...context }), OrderIds: [order.MaPhieuXuat] } });
    track('checkoutReceipts', customer.MaKhachHang);
    await tx.yeuCauNhapHang.create({ data: { MaNhanVien: employee.MaNhanVien, MaSanPham: product.MaSanPham } });
    track('purchaseRequests', employee.MaNhanVien);
    const post = await tx.baiViet.create({ data: { TieuDe: `[DEMO] Cẩm nang ${categoryName.toLowerCase()} ${number}`, MoTa: `Nội dung trình diễn về ${categoryName.toLowerCase()}. Chọn đúng kích cỡ và kiểm tra hướng dẫn bảo quản của từng sản phẩm. Đây là bài viết mẫu, không phải công bố về hàng hóa thực tế.`, Anh: '/images/demo-catalog.png', TheLoai: 'Tin tức' } }); track('posts', post.MaBaiViet);
    const contact = await tx.lienHe.create({ data: { HoTen: customer.TenKhach, Email: customer.Email, NoiDung: `DEMO: cần tư vấn ${categoryName.toLowerCase()}. Không gửi phản hồi thực tế đến địa chỉ này.` } }); track('contacts', contact.MaLienHe);
  }
  await tx.settingsAudit.create({ data: { Version: 1, ActorId: adminId, Note: 'Tạo cài đặt DEMO riêng; không thay cấu hình cửa hàng.' } });
  return { version: 1, project: demoProject, createdAt: new Date().toISOString(), ids, counts: Object.fromEntries(Object.entries(ids).map(([entity, values]) => [entity, values.length])) };
}
