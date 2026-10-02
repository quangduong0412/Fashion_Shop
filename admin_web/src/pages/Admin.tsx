import React, { useState, useEffect } from 'react';
import './Admin.css';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardView from '../components/DashboardView';
import ProductsView from '../components/ProductsView';
import ProductEditorModal from '../components/ProductEditorModal';
import OrdersView from '../components/OrdersView';
import CustomersView from '../components/CustomersView';
import EmployeesView from '../components/EmployeesView';
import SuppliersView from '../components/SuppliersView';
import ImportsView from '../components/ImportsView';
import ExportsView from '../components/ExportsView';
import ReportsView from '../components/ReportsView';
import SettingsView from '../components/SettingsView';
import PostsView from '../components/PostsView';
import ContactsView from '../components/ContactsView';
import BranchesView from '../components/BranchesView';
import RolesView from '../components/RolesView';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminName, setAdminName] = useState('Admin');
  const [jobTitle, setJobTitle] = useState('Quản Trị Viên');

  // Stats Data
  const [stats, setStats] = useState({ products: 0, users: 0, orders: 0, revenue: 0 });
  const [reports, setReports] = useState({ revenueToday: 0, revenueMonth: 0, topProducts: [] });
  
  // Lists
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [importReceipts, setImportReceipts] = useState<any[]>([]);
  const [exportReceipts, setExportReceipts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // --- TÌM KI?M ---
  const [searchProduct, setSearchProduct] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchPost, setSearchPost] = useState('');

  // --- L?C S?N PH?M ADMIN ---
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
  const [adminStockFilter, setAdminStockFilter] = useState('all'); // all | low | out

  // --- PHÂN TRANG ---
  const PAGE_SIZE = 10;
  const [productPage, setProductPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [employeePage, setEmployeePage] = useState(1);

  useEffect(() => {
    // Check Auth
    const adminStr = localStorage.getItem('isAdmin');
    const userStr = localStorage.getItem('currentUser');
    
    if (adminStr !== 'true' || !userStr) {
      alert('Vui lòng dang nh?p d? truy c?p Admin!');
      window.location.href = '/login';
    } else {
      const user = JSON.parse(userStr);
      setAdminName(user.name || 'Admin');
      setJobTitle(user.jobTitle || 'Quản Trị Viên');
    }

    // Load initial data
    loadAllData();
  }, []);

  const loadAllData = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/admin', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = data.error || `Máy chủ trả về lỗi ${res.status}.`;
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
            throw new Error('Phiên quản trị đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
          }
          throw new Error(message);
        }
        return data;
      })
      .then(data => {
        if(data.error) throw new Error(data.error);
        setProducts(data.products || []);
        setUsers(data.users || []);
        setOrders(data.orders || []);
        setSuppliers(data.suppliers || []);
        setContacts(data.contacts || []);
        setPosts(data.posts || []);
        setBranches(data.branches || []);
        setRoles(data.roles || []);
        setEmployees(data.employees || []);
        setImportReceipts(data.importReceipts || []);
        setExportReceipts(data.exportReceipts || []);
        setCategories(data.categories || []);
        setWarehouses(data.warehouses || []);

        const revenue = (data.orders || []).reduce((sum: number, o: any) => ['CANCELLED', 'Đã hủy'].includes(o.status) ? sum : sum + o.total, 0);
        setStats({ 
          products: (data.products || []).length, 
          users: (data.users || []).length, 
          orders: (data.orders || []).length, 
          revenue 
        });
      })
      .catch(err => {
        console.error('Failed to load admin data:', err);
        const message = err instanceof Error ? err.message : 'Lỗi không xác định.';
        alert(`Không thể tải dữ liệu quản trị: ${message}`);
        if (message.includes('Phiên quản trị')) window.location.href = '/login';
      });
  };

  // --- HÀM X? LÝ S?N PH?M ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Xóa sản phẩm này? Sản phẩm còn hàng hoặc có lịch sử cần chuyển sang Tạm ngừng.')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:4000/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xóa sản phẩm.');
      loadAllData();
    } catch (cause) { alert(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ.'); }
  };

  // --- HÀM X? LÝ ÐON HÀNG ---
  const handleUpdateOrderStatus = async (id: number, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:4000/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được trạng thái đơn hàng.');
      loadAllData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!window.confirm(`Xóa đơn #${id}? Tồn kho sẽ được hoàn lại nếu đơn chưa bị hủy.`)) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:4000/api/orders/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được đơn hàng.');
      loadAllData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
    }
  };

  // --- HÀM X? LÝ BÀI VI?T ---
  const handleSavePost = (data: any) => {
    const token = localStorage.getItem('token');
    const postData = {
      TieuDe: data.TieuDe,
      MoTa: data.MoTa,
      Anh: data.Anh || '/images/thoi-trang-nam.jpg',
      TheLoai: data.TheLoai
    };
    const url = data.id ? `http://localhost:4000/api/posts/${data.id}` : 'http://localhost:4000/api/posts';
    const method = data.id ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(postData)
    }).then(() => loadAllData());
  };

  const handleDeletePost = (id: number) => {
    if(!window.confirm('Xóa bài vi?t này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/posts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM X? LÝ NGU?I DÙNG ---
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const url = editingUser ? `http://localhost:4000/api/users/${editingUser.id}` : 'http://localhost:4000/api/users';
    const method = editingUser ? 'PUT' : 'POST';
    const body: any = { 
      name: form.name.value, 
      phone: form.phone.value,
      email: form.email.value,
      password: form.password?.value || ''
    };

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    }).then(async res => {
      if (!res.ok) {
         const data = await res.json();
         alert(data.error || 'Ðã có l?i x?y ra');
         return;
      }
      setShowUserModal(false); 
      loadAllData(); 
    });
  };

  const handleDeleteUser = (id: number) => {
    if(!window.confirm('C?nh báo: Xóa ngu?i dùng s? xóa c? don hàng c?a h?. B?n ch?c ch?n ch??')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM X? LÝ NHÀ CUNG C?P ---
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    
    const url = editingSupplier ? `http://localhost:4000/api/suppliers/${editingSupplier.id}` : 'http://localhost:4000/api/suppliers';
    const method = editingSupplier ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: form.name.value, phone: form.phone.value })
    }).then(() => { setShowSupplierModal(false); loadAllData(); });
  };

  const handleDeleteSupplier = (id: number) => {
    if(!window.confirm('Xóa nhà cung c?p này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/suppliers/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM X? LÝ PH?N H?I ---
  const handleDeleteContact = (id: number) => {
    if(!window.confirm('Xóa ph?n h?i này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/contacts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM X? LÝ CHI NHÁNH ---
  const handleSaveBranch = (data: any) => {
    const token = localStorage.getItem('token');
    const url = data.id ? `http://localhost:4000/api/branches/${data.id}` : 'http://localhost:4000/api/branches';
    const method = data.id ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => loadAllData());
  };

  const handleDeleteBranch = (id: number) => {
    if(!window.confirm('Xóa chi nhánh này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/branches/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(() => loadAllData());
  };

  // --- HÀM X? LÝ CH?C V? ---
  const handleSaveRole = (data: any) => {
    const token = localStorage.getItem('token');
    const url = data.id ? `http://localhost:4000/api/roles/${data.id}` : 'http://localhost:4000/api/roles';
    const method = data.id ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => loadAllData());
  };

  const handleDeleteRole = (id: number) => {
    if(!window.confirm('Xóa ch?c v? này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(() => loadAllData());
  };

  // --- HÀM X? LÝ NHÂN VIÊN ---
  const handleSaveEmployee = (data: any) => {
    const token = localStorage.getItem('token');
    const url = data.id ? `http://localhost:4000/api/employees/${data.id}` : 'http://localhost:4000/api/employees';
    const method = data.id ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => loadAllData());
  };

  const handleDeleteEmployee = (id: number) => {
    if(!window.confirm('Xóa nhân viên này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/employees/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(() => loadAllData());
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const isSuperAdmin = jobTitle === 'Quản Trị Viên';
  const isSales = jobTitle === 'Nhân Viên Bán Hàng';
  const isWarehouse = jobTitle === 'Thủ Kho';

  // --- B? L?C ---
  const filteredProducts = products.filter(p => {
    const matchName = (p.name || '').toLowerCase().includes(searchProduct.toLowerCase());
    const matchCat = adminCategoryFilter === 'all' ||
      String(p.category || '').toLowerCase() === adminCategoryFilter ||
      String(p.categoryName || '').toLowerCase().includes(adminCategoryFilter);
    const qty = p.quantity || 0;
    const matchStock =
      adminStockFilter === 'all' ? true :
      adminStockFilter === 'out'  ? qty === 0 :
      adminStockFilter === 'low'  ? (qty > 0 && qty <= 5) :
      adminStockFilter === 'ok'   ? qty > 5 : true;
    return matchName && matchCat && matchStock;
  });
  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.phone || '').includes(searchUser));
  const filteredOrders = orders.filter(o =>
    (o.customerName || o.name || '').toLowerCase().includes(searchOrder.toLowerCase()) ||
    String(o.id).includes(searchOrder));
  const filteredEmployees = employees.filter(e =>
    (e.name || '').toLowerCase().includes(searchEmployee.toLowerCase()) ||
    (e.phone || '').includes(searchEmployee) ||
    (e.branchName || '').toLowerCase().includes(searchEmployee.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchSupplier.toLowerCase()) ||
    (s.phone || '').includes(searchSupplier));
  const filteredPosts = posts.filter(p =>
    (p.title || '').toLowerCase().includes(searchPost.toLowerCase()));

  // --- PHÂN TRANG HELPER ---
  const paginate = <T,>(arr: T[], page: number): T[] =>
    arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = (arr: any[]) => Math.max(1, Math.ceil(arr.length / PAGE_SIZE));

  // --- COMPONENT PHÂN TRANG ---
  const PaginationBar = ({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) => (
    <div className="pagination-bar">
      <span className="page-info">Trang {current} / {total}</span>
      <div className="page-btns">
        <button className="btn-page" disabled={current === 1} onClick={() => onChange(current - 1)}>‹ Tru?c</button>
        <button className="btn-page" disabled={current === total} onClick={() => onChange(current + 1)}>Ti?p ›</button>
      </div>
    </div>
  );

  // --- COMPONENT TÌM KI?M ---
  const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="search-bar">
      <i className="fas fa-search search-icon"></i>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && <button className="search-clear" onClick={() => onChange('')}><i className="fas fa-times"></i></button>}
    </div>
  );

  return (
    <div className="bg-background font-body-md text-on-surface antialiased flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="pl-64 flex-1">
        <Header adminName={adminName} jobTitle={jobTitle} />
        <main className="w-full pt-28 pb-10 bg-gray-50 px-8 min-h-screen">
          {activeTab === 'dashboard' && <DashboardView stats={stats} orders={orders} />}
          {activeTab === 'products' && (
            <ProductsView
              products={products}
                categories={categories}
              searchProduct={searchProduct}
              setSearchProduct={setSearchProduct}
              handleDeleteProduct={handleDeleteProduct}
              openProductModal={(p) => { setEditingProduct(p || {}); setShowProductModal(true); }}
            />
          )}
          {activeTab === 'orders' && <OrdersView orders={filteredOrders} onUpdateStatus={handleUpdateOrderStatus} onDeleteOrder={handleDeleteOrder} />}
          {activeTab === 'customers' && <CustomersView users={users} />}
          {activeTab === 'employees' && <EmployeesView employees={employees} branches={branches} roles={roles} onSave={handleSaveEmployee} onDelete={handleDeleteEmployee} />}
          {activeTab === 'suppliers' && <SuppliersView suppliers={suppliers} onSave={handleSaveSupplier} onDelete={handleDeleteSupplier} />}
          {activeTab === 'imports' && <ImportsView imports={importReceipts} />}
          {activeTab === 'exports' && <ExportsView exports={exportReceipts} />}
          {activeTab === 'posts' && <PostsView posts={posts} onSave={handleSavePost} onDelete={handleDeletePost} />}
          {activeTab === 'contacts' && <ContactsView contacts={contacts} onDelete={handleDeleteContact} />}
          {activeTab === 'branches' && <BranchesView branches={branches} onSave={handleSaveBranch} onDelete={handleDeleteBranch} />}
          {activeTab === 'roles' && <RolesView roles={roles} onSave={handleSaveRole} onDelete={handleDeleteRole} />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}

          {['users', 'receipts', 'issues'].includes(activeTab) && (
             <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm mt-4 text-center text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-4 text-outline-variant">construction</span>
                <h2 className="font-headline-md text-on-surface mb-2">Ch?c nang dang du?c nâng c?p</h2>
                <p>Vui lòng chuy?n sang giao di?n cu ho?c ch? b?n c?p nh?t Crimson Sartorial ti?p theo.</p>
             </div>
          )}
        </main>
      </div>

      {/* Keep modals from old UI */}
      {showProductModal && (
        <ProductEditorModal product={editingProduct} categories={categories} warehouses={warehouses} suppliers={suppliers}
          onClose={() => setShowProductModal(false)}
          onSaved={() => { setShowProductModal(false); loadAllData(); }} />
      )}
    </div>
  );
};

export default Admin;
