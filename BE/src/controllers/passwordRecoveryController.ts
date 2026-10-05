import { Request, Response } from 'express';
import { ApiError, sendApiError, textValue } from '../services/apiErrors';
import { hashPassword, newPassword } from '../services/credentials';
import { consumePasswordReset, requestPasswordReset } from '../services/passwordRecovery';

export async function forgotPassword(req: Request, res: Response) {
  try {
    const email = textValue(req.body?.email, 'Email', 255).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION_ERROR', 'Email không hợp lệ.');
    await requestPasswordReset(email);
    res.status(202).json({ message: 'Nếu tài khoản đủ điều kiện, liên kết đặt lại mật khẩu sẽ được gửi. Vui lòng kiểm tra hộp thư hoặc liên hệ cửa hàng.' });
  } catch (error) { sendApiError(res, error); }
}
export async function recoverPassword(req: Request, res: Response) {
  try {
    const token = textValue(req.body?.token, 'Liên kết', 128);
    await consumePasswordReset(token, await hashPassword(newPassword(req.body?.newPassword)));
    res.json({ message: 'Đã đổi mật khẩu và thu hồi phiên cũ. Vui lòng đăng nhập lại.' });
  } catch (error) { sendApiError(res, error); }
}
