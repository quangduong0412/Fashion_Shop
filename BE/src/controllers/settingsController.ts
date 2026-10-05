import { Request, Response } from 'express';
import prisma from '../db';
import { ApiError, sendApiError, textValue } from '../services/apiErrors';
import { lockSettings, publicSettings, readSettings, validateSettings } from '../services/storeSettings';

async function internalData() {
  const config = await readSettings(prisma);
  const history = await prisma.settingsAudit.findMany({ take: 50, orderBy: { Id: 'desc' } });
  return { ...config, history: history.map(a => ({ version: a.Version, at: a.CreatedAt, actor: `admin #${a.ActorId}`, note: a.Note })) };
}
export async function getPublicSettings(_req: Request, res: Response) {
  try { res.json(publicSettings(await readSettings(prisma))); } catch (error) { sendApiError(res, error); }
}
export async function getInternalSettings(_req: Request, res: Response) {
  try { res.json(await internalData()); } catch (error) { sendApiError(res, error); }
}
export async function saveSettings(req: Request, res: Response) {
  try {
    const body = req.body ?? {}, settings = validateSettings(body.settings), note = textValue(body.reason, 'Lý do', 500);
    if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Cần phiên bản cấu hình đã đọc.');
    await prisma.$transaction(async tx => {
      await lockSettings(tx);
      const current = await readSettings(tx);
      if (current.version !== body.expectedVersion) throw new ApiError(409, 'SETTINGS_CHANGED', 'Cấu hình vừa được cập nhật. Vui lòng tải lại trước khi lưu.');
      const version = current.version + 1;
      await tx.storeSettings.upsert({ where: { Id: 1 }, create: { Id: 1, Value: settings, Version: version }, update: { Value: settings, Version: version } });
      await tx.settingsAudit.create({ data: { Version: version, ActorId: (req as any).user.id, Note: note } });
    });
    res.json(await internalData());
  } catch (error) { sendApiError(res, error); }
}
