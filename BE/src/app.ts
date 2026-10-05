import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { ApiError, sendApiError } from './services/apiErrors';
import { contactThrottle, loginThrottle, registerThrottle } from './middlewares/requestThrottle';
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import { authenticateToken, requireAdmin, requireStaff } from './middlewares/authMiddleware';

const app = express();

app.use(cors());
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.use(express.json({ limit: '256kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/images', express.static(path.join(__dirname, '../../fashionheaven/public/images')));

// Images only: bounded memory, server-selected suffix, no HTML/SVG uploads.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
function imageExtension(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return '.jpg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP (tối đa 5 MB).');
}

// Simple basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Fashion Haven API is running!');
});

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.post('/api/users/login', loginThrottle);
app.post('/api/users/register', registerThrottle);
app.post('/api/users/forgot-password', loginThrottle);
app.post('/api/users/reset-password', loginThrottle);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

import { getPublicSettings, getInternalSettings, saveSettings } from './controllers/settingsController';
import { getRetailReport } from './controllers/reportController';
app.get('/api/settings', getPublicSettings);
app.get('/api/settings/internal', authenticateToken, requireAdmin, getInternalSettings);
app.put('/api/settings', authenticateToken, requireAdmin, saveSettings);
app.get('/api/reports', authenticateToken, requireAdmin, getRetailReport);

// New unified routes
import {
  getAdminData, getPostsData, getPostById, getContacts, createContact, createPost, updatePost, deletePost,
  createSupplier, updateSupplier, deleteSupplier, deleteContact,
  createBranch, updateBranch, deleteBranch,
  createRole, updateRole, deleteRole,
  createEmployee, updateEmployee, deleteEmployee,
  createImport, deleteImport, createExport, deleteExport
} from './controllers/dataController';

app.get('/api/admin', authenticateToken, requireStaff, getAdminData);

app.get('/api/posts', getPostsData);
app.get('/api/posts/:id', getPostById);
app.post('/api/posts', authenticateToken, requireAdmin, createPost);
app.put('/api/posts/:id', authenticateToken, requireAdmin, updatePost);
app.delete('/api/posts/:id', authenticateToken, requireAdmin, deletePost);

app.get('/api/contacts', authenticateToken, requireAdmin, getContacts);
app.post('/api/contacts', contactThrottle, createContact);
app.delete('/api/contacts/:id', authenticateToken, requireAdmin, deleteContact);

app.post('/api/suppliers', authenticateToken, requireAdmin, createSupplier);
app.put('/api/suppliers/:id', authenticateToken, requireAdmin, updateSupplier);
app.delete('/api/suppliers/:id', authenticateToken, requireAdmin, deleteSupplier);

app.post('/api/branches', authenticateToken, requireAdmin, createBranch);
app.put('/api/branches/:id', authenticateToken, requireAdmin, updateBranch);
app.delete('/api/branches/:id', authenticateToken, requireAdmin, deleteBranch);

app.post('/api/roles', authenticateToken, requireAdmin, createRole);
app.put('/api/roles/:id', authenticateToken, requireAdmin, updateRole);
app.delete('/api/roles/:id', authenticateToken, requireAdmin, deleteRole);

app.post('/api/employees', authenticateToken, requireAdmin, createEmployee);
app.put('/api/employees/:id', authenticateToken, requireAdmin, updateEmployee);
app.delete('/api/employees/:id', authenticateToken, requireAdmin, deleteEmployee);

import { listImports, updateImportStatus } from './controllers/importController';
app.get('/api/imports', authenticateToken, requireAdmin, listImports);
app.put('/api/imports/:id/status', authenticateToken, requireAdmin, updateImportStatus);
app.post('/api/imports', authenticateToken, requireAdmin, createImport);
app.delete('/api/imports/:id', authenticateToken, requireAdmin, deleteImport);

app.post('/api/exports', authenticateToken, requireAdmin, createExport);
app.delete('/api/exports/:id', authenticateToken, requireAdmin, deleteExport);

// Upload API
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng chọn ảnh.');
    const filename = randomUUID() + imageExtension(req.file.buffer);
    const directory = path.join(__dirname, '../uploads');
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(path.join(directory, filename), req.file.buffer, { flag: 'wx' });
    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (error) { sendApiError(res, error); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy API.', code: 'NOT_FOUND' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Ảnh vượt quá 5 MB.' : 'Dữ liệu tải ảnh không hợp lệ.', code: tooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_UPLOAD' });
    return;
  }
  const type = error && typeof error === 'object' && 'type' in error ? error.type : '';
  if (type === 'entity.parse.failed' || type === 'entity.too.large') {
    res.status(type === 'entity.too.large' ? 413 : 400).json({ error: 'Dữ liệu JSON không hợp lệ hoặc quá lớn.', code: 'INVALID_JSON' });
    return;
  }
  sendApiError(res, error);
});

export default app;
