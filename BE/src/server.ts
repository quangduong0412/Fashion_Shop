import express, { Request, Response } from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes';
import productRoutes from './routes/productRoutes'; 
import { authenticateToken, requireAdmin } from './middlewares/authMiddleware';


const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

// Simple basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Fashion Haven API is running!');
});

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// New unified routes
import { 
  getAdminData, getPostsData, createContact, createPost, updatePost, deletePost, 
  createSupplier, updateSupplier, deleteSupplier, deleteContact,
  createBranch, updateBranch, deleteBranch,
  createRole, updateRole, deleteRole,
  createEmployee, updateEmployee, deleteEmployee
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


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});