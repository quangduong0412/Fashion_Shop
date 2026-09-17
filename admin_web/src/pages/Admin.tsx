import React, { useState, useEffect } from 'react';
import './Admin.css';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardView from '../components/DashboardView';
import ProductsView from '../components/ProductsView';
import OrdersView from '../components/OrdersView';

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

  // --- TÌM KIẾM ---
  const [searchProduct, setSearchProduct] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchPost, setSearchPost] = useState('');

  // --- LỌC SẢN PHẨM ADMIN ---
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
      alert('Vui lòng đăng nhập để truy cập Admin!');
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
      .then(res => res.json())
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

        const revenue = (data.orders || []).reduce((sum: number, o: any) => o.status !== 'Đã hủy' ? sum + o.total : sum, 0);
        setStats({ 
          products: (data.products || []).length, 
          users: (data.users || []).length, 
          orders: (data.orders || []).length, 
          revenue 
        });
      })
      .catch(err => {
        console.error('Failed to load admin data:', err);
        alert('Không thể kết nối đến máy chủ CSDL hoặc bạn không có quyền truy cập!');
        window.location.href = '/login';
      });
  };

  // --- HÀM XỬ LÝ SẢN PHẨM ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const prodData = {
      name: form.name.value,
      price: Number(form.price.value),
      stock: Number(form.stock.value),
      image: form.image.value || '/images/ao-thun-nu.png',
      categoryId: Number(form.categoryId.value)
    };

    const url = editingProduct ? `http://localhost:4000/api/products/${editingProduct.id}` : 'http://localhost:4000/api/products';
    fetch(url, {
      method: editingProduct ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(prodData)
    }).then(() => { setShowProductModal(false); loadAllData(); });
  };

  const handleDeleteProduct = (id: number) => {
    if(!window.confirm('Xóa sản phẩm này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ ĐƠN HÀNG ---
  const handleUpdateOrderStatus = (id: number, status: string) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    }).then(() => loadAllData());
  };

  const handleDeleteOrder = (id: number) => {
    if(!window.confirm('Xóa đơn hàng này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/orders/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ BÀI VIẾT ---
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const postData = {
      title: form.title.value,
      description: form.description.value,
      image: form.image.value || '/images/thoi-trang-nam.jpg',
      type: form.type.value
    };
    
    const url = editingPost ? `http://localhost:4000/api/posts/${editingPost.id}` : 'http://localhost:4000/api/posts';
    fetch(url, {
      method: editingPost ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(postData)
    }).then(() => { setShowPostModal(false); loadAllData(); });
  };

  const handleDeletePost = (id: number) => {
    if(!window.confirm('Xóa bài viết này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/posts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ NGƯỜI DÙNG ---
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
         alert(data.error || 'Đã có lỗi xảy ra');
         return;
      }
      setShowUserModal(false); 
      loadAllData(); 
    });
  };

  const handleDeleteUser = (id: number) => {
    if(!window.confirm('Cảnh báo: Xóa người dùng sẽ xóa cả đơn hàng của họ. Bạn chắc chắn chứ?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ NHÀ CUNG CẤP ---
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
    if(!window.confirm('Xóa nhà cung cấp này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/suppliers/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ PHẢN HỒI ---
  const handleDeleteContact = (id: number) => {
    if(!window.confirm('Xóa phản hồi này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/contacts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ CHI NHÁNH ---
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const data = { name: form.name.value, address: form.address.value, phone: form.phone.value };
    const url = editingBranch ? `http://localhost:4000/api/branches/${editingBranch.id}` : 'http://localhost:4000/api/branches';
    fetch(url, {
      method: editingBranch ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => { setShowBranchModal(false); loadAllData(); });
  };

  const handleDeleteBranch = (id: number) => {
    if(!window.confirm('Xóa chi nhánh này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/branches/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ CHỨC VỤ ---
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const data = { name: form.name.value };
    const url = editingRole ? `http://localhost:4000/api/roles/${editingRole.id}` : 'http://localhost:4000/api/roles';
    fetch(url, {
      method: editingRole ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => { setShowRoleModal(false); loadAllData(); });
  };

  const handleDeleteRole = (id: number) => {
    if(!window.confirm('Xóa chức vụ này?')) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:4000/api/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(() => loadAllData());
  };

  // --- HÀM XỬ LÝ NHÂN VIÊN ---
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target as any;
    const data = { 
        name: form.name.value, 
        roleId: form.roleId.value, 
        branchId: form.branchId.value, 
        address: form.address.value, 
        phone: form.phone.value, 
        username: form.username?.value || '', 
        password: form.password?.value || '' 
    };
    const url = editingEmployee ? `http://localhost:4000/api/employees/${editingEmployee.id}` : 'http://localhost:4000/api/employees';
    fetch(url, {
      method: editingEmployee ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(() => { setShowEmployeeModal(false); loadAllData(); });
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

  // --- BỘ LỌC ---
  const filteredProducts = products.filter(p => {
    const matchName = p.name?.toLowerCase().includes(searchProduct.toLowerCase());
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
    u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.phone || '').includes(searchUser));
  const filteredOrders = orders.filter(o =>
    (o.customerName || o.name || '').toLowerCase().includes(searchOrder.toLowerCase()) ||
    String(o.id).includes(searchOrder));
  const filteredEmployees = employees.filter(e =>
    e.name?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    (e.phone || '').includes(searchEmployee) ||
    (e.branchName || '').toLowerCase().includes(searchEmployee.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchSupplier.toLowerCase()) ||
    (s.phone || '').includes(searchSupplier));
  const filteredPosts = posts.filter(p =>
    p.title?.toLowerCase().includes(searchPost.toLowerCase()));

  // --- PHÂN TRANG HELPER ---
  const paginate = <T,>(arr: T[], page: number): T[] =>
    arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = (arr: any[]) => Math.max(1, Math.ceil(arr.length / PAGE_SIZE));

  // --- COMPONENT PHÂN TRANG ---
  const PaginationBar = ({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) => (
    <div className="pagination-bar">
      <span className="page-info">Trang {current} / {total}</span>
      <div className="page-btns">
        <button className="btn-page" disabled={current === 1} onClick={() => onChange(current - 1)}>‹ Trước</button>
        <button className="btn-page" disabled={current === total} onClick={() => onChange(current + 1)}>Tiếp ›</button>
      </div>
    </div>
  );

  // --- COMPONENT TÌM KIẾM ---
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
        <main className="w-full pt-16 bg-background px-space-lg min-h-screen">
          {activeTab === 'dashboard' && <DashboardView stats={stats} orders={orders} />}
          {activeTab === 'products' && (
            <ProductsView 
              products={filteredProducts} 
              searchProduct={searchProduct} 
              setSearchProduct={setSearchProduct} 
              handleDeleteProduct={handleDeleteProduct}
              openProductModal={(p) => { setEditingProduct(p || {}); setShowProductModal(true); }} 
            />
          )}
          {activeTab === 'orders' && <OrdersView orders={filteredOrders} />}
          
          {['users', 'suppliers', 'contacts', 'posts', 'branches', 'roles', 'employees', 'receipts', 'issues'].includes(activeTab) && (
             <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm mt-4 text-center text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-4 text-outline-variant">construction</span>
                <h2 className="font-headline-md text-on-surface mb-2">Chức năng đang được nâng cấp</h2>
                <p>Vui lòng chuyển sang giao diện cũ hoặc chờ bản cập nhật Crimson Sartorial tiếp theo.</p>
             </div>
          )}
        </main>
      </div>

      {/* Keep modals from old UI */}
      {showProductModal && (
        <div className="modal">
          <div className="modal-content" style={{maxWidth: '600px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px'}}>
            <h2>{editingProduct?.id ? 'Cập Nhật Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
            <div className="form-group" style={{marginTop: '16px'}}>
              <label>Tên Sản Phẩm:</label>
              <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} style={{width:'100%', padding:'8px', border:'1px solid #ccc'}} />
            </div>
            <div className="form-group" style={{marginTop: '16px'}}>
              <label>Giá Bán:</label>
              <input type="number" value={editingProduct?.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} style={{width:'100%', padding:'8px', border:'1px solid #ccc'}} />
            </div>
            <div className="form-actions" style={{marginTop: '24px', display: 'flex', gap: '16px'}}>
              <button onClick={handleSaveProduct} style={{padding: '8px 16px', background: '#b6152b', color: '#fff', border:'none', borderRadius:'4px'}}>Lưu Thay Đổi</button>
              <button onClick={() => setShowProductModal(false)} style={{padding: '8px 16px'}}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
