import { Request, Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { ApiError, positiveId, sendApiError } from '../services/apiErrors';
import type { Principal } from '../services/sessions';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_EVIDENCE = 3;
const uploadDirectory = process.env.RETURN_EVIDENCE_DIR || path.resolve(process.cwd(), 'private-uploads', 'return-evidence');

type EvidenceRecord = { id: string; storageKey: string; mimeType: string; sha256: string; createdAt: string };

export const uploadReturnEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 1 }
}).single('image');

function imageType(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mimeType: 'image/png', extension: '.png' };
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { mimeType: 'image/jpeg', extension: '.jpg' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mimeType: 'image/webp', extension: '.webp' };
  throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP (tối đa 5 MB).');
}

function asEvidence(value: unknown): EvidenceRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is EvidenceRecord => !!item && typeof item === 'object'
    && typeof (item as EvidenceRecord).id === 'string' && typeof (item as EvidenceRecord).storageKey === 'string'
    && typeof (item as EvidenceRecord).mimeType === 'string' && typeof (item as EvidenceRecord).sha256 === 'string'
    && typeof (item as EvidenceRecord).createdAt === 'string');
}

export function evidenceDto(returnId: number, value: unknown) {
  return asEvidence(value).map(item => ({ id: item.id, url: `/returns/${returnId}/evidence/${item.id}`, createdAt: item.createdAt }));
}

export async function addReturnEvidence(req: Request, res: Response) {
  let writtenPath: string | undefined;
  try {
    const user = (req as any).user as Principal;
    if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng sở hữu yêu cầu được tải ảnh minh chứng.');
    const id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng chọn một ảnh minh chứng.');
    const type = imageType(req.file.buffer);
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    const evidenceId = randomUUID();
    const storageKey = `${randomUUID()}${type.extension}`;
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT Id FROM returnrequest WHERE Id = ${id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { Id: id }, select: { CustomerId: true, Status: true, Evidence: true } });
      if (!current || current.CustomerId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu đổi trả.');
      if (!['REQUESTED', 'APPROVED'].includes(current.Status)) throw new ApiError(409, 'RETURN_EVIDENCE_CLOSED', 'Chỉ bổ sung ảnh khi yêu cầu đang chờ duyệt hoặc đã được duyệt nhận hàng.');
      const evidence = asEvidence(current.Evidence);
      const duplicate = evidence.find(item => item.sha256 === sha256);
      if (duplicate) return { item: duplicate, duplicate: true };
      if (evidence.length >= MAX_EVIDENCE) throw new ApiError(409, 'EVIDENCE_LIMIT_REACHED', 'Mỗi yêu cầu được đính kèm tối đa 3 ảnh.');
      await fs.promises.mkdir(uploadDirectory, { recursive: true });
      writtenPath = path.join(uploadDirectory, storageKey);
      await fs.promises.writeFile(writtenPath, req.file!.buffer, { flag: 'wx', mode: 0o600 });
      const item: EvidenceRecord = { id: evidenceId, storageKey, mimeType: type.mimeType, sha256, createdAt: new Date().toISOString() };
      await tx.returnRequest.update({ where: { Id: id }, data: { Evidence: [...evidence, item] as Prisma.InputJsonValue, Version: { increment: 1 } } });
      await tx.returnEvent.create({ data: { ReturnId: id, FromStatus: current.Status, ToStatus: current.Status,
        ActorRole: user.role, ActorId: user.id, Note: `Khách đã đính kèm ảnh minh chứng #${item.id}` } });
      return { item, duplicate: false };
    }, { timeout: 20000 });
    writtenPath = undefined;
    res.status(result.duplicate ? 200 : 201).json({ message: result.duplicate ? 'Ảnh này đã được đính kèm trước đó.' : 'Đã tải ảnh minh chứng lên riêng tư.', evidence: { id: result.item.id, url: `/returns/${id}/evidence/${result.item.id}`, createdAt: result.item.createdAt } });
  } catch (error) {
    if (writtenPath) await fs.promises.rm(writtenPath, { force: true }).catch(() => undefined);
    sendApiError(res, error);
  }
}

export async function getReturnEvidence(req: Request, res: Response) {
  try {
    const user = (req as any).user as Principal;
    if (!['user', 'admin'].includes(user.role)) throw new ApiError(403, 'FORBIDDEN', 'Tài khoản này không có quyền xem ảnh đổi trả.');
    const id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    const evidenceId = req.params.evidenceId;
    if (typeof evidenceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(evidenceId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh minh chứng.');
    const record = await prisma.returnRequest.findUnique({ where: { Id: id }, select: { CustomerId: true, Evidence: true } });
    if (!record || user.role === 'user' && record.CustomerId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh minh chứng.');
    const item = asEvidence(record.Evidence).find(candidate => candidate.id === evidenceId);
    if (!item || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(item.storageKey) || !['image/png', 'image/jpeg', 'image/webp'].includes(item.mimeType)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh minh chứng.');
    const filePath = path.join(uploadDirectory, item.storageKey);
    try { await fs.promises.access(filePath, fs.constants.R_OK); }
    catch { throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh minh chứng.'); }
    res.set({ 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline; filename="return-evidence"' });
    res.type(item.mimeType).sendFile(filePath, error => { if (error && !res.headersSent) sendApiError(res, error); });
  } catch (error) { sendApiError(res, error); }
}
