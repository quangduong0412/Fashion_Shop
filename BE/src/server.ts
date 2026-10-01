import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes';
import productRoutes from './routes/productRoutes'; 
import categoryRoutes from './routes/categoryRoutes';
import { authenticateToken, requireAdmin } from './middlewares/authMiddleware';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../../fashionheaven/public/images')));

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Simple basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Fashion Haven API is running!');
});

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// New unified routes
import { 
  getAdminData, getPostsData, createContact, createPost, updatePost, deletePost, 
  createSupplier, updateSupplier, deleteSupplier, deleteContact,
  createBranch, updateBranch, deleteBranch,
  createRole, updateRole, deleteRole,
  createEmployee, updateEmployee, deleteEmployee,
  createImport, deleteImport, createExport, deleteExport
} from './controllers/dataController';

app.get('/api/admin', authenticateToken, requireAdmin, getAdminData);

app.get('/api/posts', getPostsData);
app.post('/api/posts', authenticateToken, requireAdmin, createPost);
app.put('/api/posts/:id', authenticateToken, requireAdmin, updatePost);
app.delete('/api/posts/:id', authenticateToken, requireAdmin, deletePost);

app.post('/api/contacts', createContact);
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

app.post('/api/imports', authenticateToken, requireAdmin, createImport);
app.delete('/api/imports/:id', authenticateToken, requireAdmin, deleteImport);

app.post('/api/exports', authenticateToken, requireAdmin, createExport);
app.delete('/api/exports/:id', authenticateToken, requireAdmin, deleteExport);

// Upload API
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Vui lòng chọn ảnh' });
    return;
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});