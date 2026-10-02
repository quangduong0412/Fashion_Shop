import { Request, Response } from 'express';
import prisma from '../db';
import { ApiError, positiveId, sendApiError, textValue } from '../services/apiErrors';
import { hashPassword, isPasswordHash, newPassword, verifyPassword } from '../services/credentials';
import { internalRole } from '../services/access';
import { issueToken } from '../services/sessions';
import { lockLoginNamespace } from '../services/loginNamespace';

const customerSelect = { MaKhachHang: true, TenKhach: true, Email: true, DiaChi: true, DienThoai: true, HangThanhVien: true } as const;
const emailValue = (value: unknown) => {
  const email = textValue(value, 'Email', 255).toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION_ERROR', 'Email không hợp lệ.');
  return email;
};

async function upgradePassword(id: number, stored: string, candidate: string, internal: boolean) {
  if (isPasswordHash(stored)) return stored;
  const hashed = await hashPassword(candidate);
  const result = internal
    ? await prisma.account.updateMany({ where: { MaNhanVien: id, PassWord: stored }, data: { PassWord: hashed } })
    : await prisma.khachHang.updateMany({ where: { MaKhachHang: id, MatKhau: stored }, data: { MatKhau: hashed } });
  if (result.count !== 1) throw new ApiError(409, 'CREDENTIAL_CHANGED', 'Tài khoản vừa được cập nhật. Vui lòng đăng nhập lại.');
  return hashed;
}

export async function registerUser(req: Request, res: Response) {
  try {
    const body = req.body ?? {}, name = textValue(body.name, 'Họ tên', 255), email = emailValue(body.email);
    const passwordHash = await hashPassword(newPassword(body.password));
    const customer = await prisma.$transaction(async tx => {
      await lockLoginNamespace(tx);
      if (await tx.account.findUnique({ where: { UserName: email } })) throw new ApiError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng.');
      return tx.khachHang.create({ data: { TenKhach: name, Email: email, MatKhau: passwordHash } });
    });
    const user = { id: customer.MaKhachHang, name: customer.TenKhach, email: customer.Email, role: 'user' as const };
    res.status(201).json({ user, token: issueToken(user, customer.MatKhau) });
  } catch (error) { sendApiError(res, error); }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const body = req.body ?? {}, login = textValue(body.email, 'Tên đăng nhập', 255);
    if (typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập mật khẩu hợp lệ.');
    const account = await prisma.account.findUnique({ where: { UserName: login }, include: { nhanVien: { include: { chucVu: true } } } });
    if (account) {
      if (!await verifyPassword(account.PassWord, body.password)) throw new ApiError(401, 'LOGIN_FAILED', 'Sai tài khoản hoặc mật khẩu.');
      const role = internalRole(account.Role);
      if (!role) throw new ApiError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã ngưng đăng nhập. Liên hệ quản trị viên.');
      const passwordHash = await upgradePassword(account.MaNhanVien, account.PassWord, body.password, true);
      const user = { id: account.MaNhanVien, name: account.nhanVien.TenNhanVien, email: account.UserName, role, jobTitle: account.nhanVien.chucVu.TenChucVu };
      res.json({ user, token: issueToken(user, passwordHash, account.SessionEpoch) }); return;
    }
    const customer = await prisma.khachHang.findUnique({ where: { Email: login.toLocaleLowerCase() } });
    if (!customer || !await verifyPassword(customer.MatKhau, body.password)) throw new ApiError(401, 'LOGIN_FAILED', 'Sai tài khoản hoặc mật khẩu.');
    const passwordHash = await upgradePassword(customer.MaKhachHang, customer.MatKhau, body.password, false);
    const user = { id: customer.MaKhachHang, name: customer.TenKhach, email: customer.Email, role: 'user' as const };
    res.json({ user, token: issueToken(user, passwordHash) });
  } catch (error) { sendApiError(res, error); }
}

export async function getUserProfile(req: Request, res: Response) {
  try {
    const principal = (req as any).user;
    if (principal.role !== 'user') {
      const account = await prisma.account.findUnique({ where: { MaNhanVien: principal.id }, include: { nhanVien: { include: { chucVu: true } } } });
      if (!account) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
      res.json({ id: principal.id, MaKhachHang: principal.id, name: account.nhanVien.TenNhanVien, TenKhach: account.nhanVien.TenNhanVien,
        Email: account.UserName, DiaChi: account.nhanVien.DiaChi, DienThoai: account.nhanVien.DienThoai,
        role: principal.role, jobTitle: account.nhanVien.chucVu.TenChucVu, HangThanhVien: principal.role === 'admin' ? 'Quản trị viên' : 'Nhân viên' }); return;
    }
    const customer = await prisma.khachHang.findUnique({ where: { MaKhachHang: principal.id }, select: customerSelect });
    if (!customer) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng.');
    res.json({ ...customer, role: 'user' });
  } catch (error) { sendApiError(res, error); }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const principal = (req as any).user, body = req.body ?? {};
    const name = textValue(body.name, 'Họ tên', 255), phone = textValue(body.phone, 'Điện thoại', 50, false), address = textValue(body.address, 'Địa chỉ', 4000, false);
    if (principal.role !== 'user') {
      await prisma.nhanVien.update({ where: { MaNhanVien: principal.id }, data: { TenNhanVien: name, DienThoai: phone, DiaChi: address } });
      await getUserProfile(req, res); return;
    }
    const customer = await prisma.khachHang.update({ where: { MaKhachHang: principal.id }, data: { TenKhach: name, DienThoai: phone, DiaChi: address }, select: customerSelect });
    res.json({ ...customer, role: 'user' });
  } catch (error) { sendApiError(res, error); }
}

export async function createUser(req: Request, res: Response) {
  try {
    const body = req.body ?? {}, email = emailValue(body.email), name = textValue(body.name, 'Họ tên', 255);
    const phone = textValue(body.phone, 'Điện thoại', 50, false), passwordHash = await hashPassword(newPassword(body.password));
    const customer = await prisma.$transaction(async tx => {
      await lockLoginNamespace(tx);
      if (await tx.account.findUnique({ where: { UserName: email } })) throw new ApiError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng.');
      return tx.khachHang.create({ data: { TenKhach: name, Email: email, DienThoai: phone,
        MatKhau: passwordHash, HangThanhVien: 'Thành viên mới' }, select: customerSelect });
    });
    res.status(201).json(customer);
  } catch (error) { sendApiError(res, error); }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id, 'Mã khách hàng'), body = req.body ?? {};
    const email = body.email === undefined ? undefined : emailValue(body.email);
    const passwordHash = body.password ? await hashPassword(newPassword(body.password)) : undefined;
    const fields = {
      ...(body.name !== undefined ? { TenKhach: textValue(body.name, 'Họ tên', 255) } : {}),
      ...(body.phone !== undefined ? { DienThoai: textValue(body.phone, 'Điện thoại', 50, false) } : {}),
      ...(email !== undefined ? { Email: email } : {}),
      ...(passwordHash !== undefined ? { MatKhau: passwordHash } : {})
    };
    const customer = await prisma.$transaction(async tx => {
      await lockLoginNamespace(tx);
      if (email && await tx.account.findUnique({ where: { UserName: email } })) throw new ApiError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng.');
      return tx.khachHang.update({ where: { MaKhachHang: id }, data: fields, select: customerSelect });
    });
    res.json(customer);
  } catch (error) { sendApiError(res, error); }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id, 'Mã khách hàng');
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaKhachHang FROM khachhang WHERE MaKhachHang = ${id} FOR UPDATE`;
      if (await tx.phieuXuat.count({ where: { MaKhachHang: id } })) throw new ApiError(409, 'CUSTOMER_HAS_HISTORY', 'Khách hàng đã có đơn hàng; phải giữ tài khoản và lịch sử giao dịch.');
      await tx.khachHang.delete({ where: { MaKhachHang: id } });
    });
    res.json({ message: 'Đã xóa tài khoản chưa có giao dịch.' });
  } catch (error) { sendApiError(res, error); }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const principal = (req as any).user, body = req.body ?? {}, password = newPassword(body.newPassword);
    if (principal.role !== 'user') {
      const account = await prisma.account.findUnique({ where: { MaNhanVien: principal.id } });
      if (!account || !await verifyPassword(account.PassWord, body.oldPassword)) throw new ApiError(400, 'PASSWORD_MISMATCH', 'Mật khẩu cũ không đúng.');
      const result = await prisma.account.updateMany({ where: { MaNhanVien: principal.id, PassWord: account.PassWord }, data: { PassWord: await hashPassword(password) } });
      if (!result.count) throw new ApiError(409, 'CREDENTIAL_CHANGED', 'Mật khẩu vừa được cập nhật. Vui lòng đăng nhập lại.');
    } else {
      const customer = await prisma.khachHang.findUnique({ where: { MaKhachHang: principal.id } });
      if (!customer || !await verifyPassword(customer.MatKhau, body.oldPassword)) throw new ApiError(400, 'PASSWORD_MISMATCH', 'Mật khẩu cũ không đúng.');
      const result = await prisma.khachHang.updateMany({ where: { MaKhachHang: principal.id, MatKhau: customer.MatKhau }, data: { MatKhau: await hashPassword(password) } });
      if (!result.count) throw new ApiError(409, 'CREDENTIAL_CHANGED', 'Mật khẩu vừa được cập nhật. Vui lòng đăng nhập lại.');
    }
    res.json({ message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.' });
  } catch (error) { sendApiError(res, error); }
}
