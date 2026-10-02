import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { jwtSecret } from '../config';
import { internalRole } from '../services/access';
import { ApiError, sendApiError } from '../services/apiErrors';
import { sessionOptions, sessionVersion } from '../services/sessions';
import type { Principal } from '../services/sessions';

export interface AuthRequest extends Request { user?: Principal; }

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!match) { res.status(401).json({ error: 'Vui lòng đăng nhập.', code: 'AUTH_REQUIRED' }); return; }
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(match[1]!, jwtSecret(), { ...sessionOptions, algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id < 1 || !['user', 'staff', 'admin'].includes(decoded.role) || typeof decoded.sessionVersion !== 'string') throw new Error('Invalid claims');
    claims = decoded;
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', code: 'SESSION_EXPIRED' }); return;
  }
  try {
    if (claims.role === 'user') {
      const customer = await prisma.khachHang.findUnique({ where: { MaKhachHang: claims.id }, select: { MaKhachHang: true, Email: true, MatKhau: true } });
      if (!customer || sessionVersion(customer.MatKhau) !== claims.sessionVersion) throw new ApiError(401, 'SESSION_REVOKED', 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.');
      req.user = { id: customer.MaKhachHang, email: customer.Email, role: 'user' };
    } else {
      const account = await prisma.account.findUnique({ where: { MaNhanVien: claims.id }, select: { MaNhanVien: true, UserName: true, PassWord: true, Role: true, SessionEpoch: true } });
      const role = account && internalRole(account.Role);
      if (!account || !role || sessionVersion(account.PassWord, account.SessionEpoch) !== claims.sessionVersion) throw new ApiError(401, 'SESSION_REVOKED', 'Tài khoản đã ngưng đăng nhập hoặc phiên đã bị thu hồi.');
      req.user = { id: account.MaNhanVien, email: account.UserName, role };
    }
    next();
  } catch (error) { sendApiError(res, error); }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role === 'admin') { next(); return; }
  res.status(403).json({ error: 'Chức năng này yêu cầu quyền quản trị viên.', code: 'FORBIDDEN' });
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user && ['staff', 'admin'].includes(req.user.role)) { next(); return; }
  res.status(403).json({ error: 'Chức năng này dành cho nhân viên hoặc quản trị viên.', code: 'FORBIDDEN' });
}
