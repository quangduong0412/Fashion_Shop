import prisma from '../db';
import { ApiError, positiveId, textValue } from './apiErrors';
import { hashPassword, newPassword } from './credentials';
import { lockLoginNamespace } from './loginNamespace';

export const employeeInclude = {
  chucVu: true, chiNhanh: true, account: { select: { UserName: true, Role: true } }
} as const;
export function employeeResponse(employee: any) {
  return { id: employee.MaNhanVien, name: employee.TenNhanVien, roleId: employee.MaChucVu, roleName: employee.chucVu?.TenChucVu,
    branchId: employee.MaChiNhanh, branchName: employee.chiNhanh?.TenChiNhanh, phone: employee.DienThoai, address: employee.DiaChi,
    username: employee.account?.UserName ?? '', accountRole: employee.account?.Role === 'USER' ? 'STAFF' : employee.account?.Role ?? null,
    hasAccount: !!employee.account };
}

export async function saveEmployee(id: number | undefined, body: any, actorId: number) {
  const accountRole = body.accountRole;
  if (accountRole !== undefined && !['ADMIN', 'STAFF', 'DISABLED'].includes(accountRole)) throw new ApiError(400, 'VALIDATION_ERROR', 'Quyền tài khoản không hợp lệ.');
  const hasNewPassword = body.password !== undefined && body.password !== '';
  const passwordHash = hasNewPassword ? await hashPassword(newPassword(body.password)) : undefined;
  const requestedUsername = body.username === undefined ? undefined : textValue(body.username, 'Tên đăng nhập', 255, false);
  const fields = {
    ...(body.name !== undefined ? { TenNhanVien: textValue(body.name, 'Họ tên', 255) } : {}),
    ...(body.roleId !== undefined ? { MaChucVu: positiveId(body.roleId, 'Chức vụ') } : {}),
    ...(body.branchId !== undefined ? { MaChiNhanh: positiveId(body.branchId, 'Chi nhánh') } : {}),
    ...(body.phone !== undefined ? { DienThoai: textValue(body.phone, 'Điện thoại', 50, false) } : {}),
    ...(body.address !== undefined ? { DiaChi: textValue(body.address, 'Địa chỉ', 4000, false) } : {})
  };
  if (!id && (!fields.TenNhanVien || !fields.MaChucVu || !fields.MaChiNhanh)) throw new ApiError(400, 'VALIDATION_ERROR', 'Họ tên, chức vụ và chi nhánh là bắt buộc.');
  return prisma.$transaction(async tx => {
    // Coordinate grants/deactivations so two requests cannot remove the last administrator.
    await tx.$queryRaw`SELECT MaNhanVien FROM account WHERE Role = 'ADMIN' ORDER BY MaNhanVien FOR UPDATE`;
    await lockLoginNamespace(tx);
    const existing = id ? await tx.nhanVien.findUnique({ where: { MaNhanVien: id }, include: employeeInclude }) : null;
    if (id && !existing) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy nhân viên.');
    const previousAccount = existing?.account;
    const username = requestedUsername ?? previousAccount?.UserName ?? '';
    if (previousAccount && !username) throw new ApiError(400, 'VALIDATION_ERROR', 'Tên đăng nhập không được để trống.');
    const nextRole = accountRole ?? (previousAccount?.Role === 'USER' ? 'STAFF' : previousAccount?.Role) ?? 'STAFF';
    if (previousAccount?.Role === 'ADMIN' && nextRole !== 'ADMIN') {
      if (actorId === id) throw new ApiError(409, 'SELF_ACCESS_CHANGE', 'Không thể tự hạ quyền hoặc ngưng tài khoản đang đăng nhập.');
      if (await tx.account.count({ where: { Role: 'ADMIN' } }) <= 1) throw new ApiError(409, 'LAST_ADMIN', 'Phải giữ ít nhất một quản trị viên hoạt động.');
    }
    if (!username && passwordHash) throw new ApiError(400, 'VALIDATION_ERROR', 'Cần tên đăng nhập để tạo hoặc đổi mật khẩu tài khoản.');
    if (username && !previousAccount && !passwordHash) throw new ApiError(400, 'VALIDATION_ERROR', 'Tài khoản mới cần mật khẩu tối thiểu 8 ký tự.');
    if (username && await tx.khachHang.findUnique({ where: { Email: username } })) throw new ApiError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được khách hàng sử dụng.');
    if (fields.MaChucVu && !await tx.chucVu.findUnique({ where: { MaChucVu: fields.MaChucVu } })) throw new ApiError(400, 'VALIDATION_ERROR', 'Chức vụ không tồn tại.');
    if (fields.MaChiNhanh && !await tx.chiNhanh.findUnique({ where: { MaChiNhanh: fields.MaChiNhanh } })) throw new ApiError(400, 'VALIDATION_ERROR', 'Chi nhánh không tồn tại.');
    const employee = id ? await tx.nhanVien.update({ where: { MaNhanVien: id }, data: fields }) : await tx.nhanVien.create({ data: {
      ...fields, TenNhanVien: fields.TenNhanVien!, MaChucVu: fields.MaChucVu!, MaChiNhanh: fields.MaChiNhanh!
    } });
    if (username) {
      if (previousAccount) await tx.account.update({ where: { MaNhanVien: employee.MaNhanVien }, data: {
        UserName: username, Role: nextRole, ...(passwordHash ? { PassWord: passwordHash } : {}),
        // A temporarily disabled account must not revive old tokens when reactivated.
        ...(previousAccount.Role !== nextRole && (previousAccount.Role === 'DISABLED' || nextRole === 'DISABLED') ? { SessionEpoch: { increment: 1 } } : {})
      } });
      else await tx.account.create({ data: { MaNhanVien: employee.MaNhanVien, UserName: username, Role: nextRole, PassWord: passwordHash! } });
    }
    return tx.nhanVien.findUniqueOrThrow({ where: { MaNhanVien: employee.MaNhanVien }, include: employeeInclude });
  });
}

export async function deactivateEmployee(id: number, actorId: number) {
  const existing = await prisma.account.findUnique({ where: { MaNhanVien: id }, select: { MaNhanVien: true } });
  if (!existing) throw new ApiError(409, 'NO_ACCOUNT', 'Hồ sơ này không có tài khoản đăng nhập. Hồ sơ nhân viên được giữ để bảo toàn lịch sử.');
  return saveEmployee(id, { accountRole: 'DISABLED' }, actorId);
}
