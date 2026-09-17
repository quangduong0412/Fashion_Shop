import React, { useState, useEffect } from 'react';
import './Admin.css';

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
    <div className="admin-layout">
        <div className="wrap">
            <aside className="sidebar">
                <div className="brand">
                    <div className="logo">FH</div>
                    <h3>Admin Panel</h3>
                </div>
                <nav className="nav">
                    <a href="#dashboard" className={activeTab === 'dashboard' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}><i className="fas fa-chart-line"></i> Tổng quan</a>
                    
                    {(isSuperAdmin || isSales || isWarehouse) && <a href="#products" className={activeTab === 'products' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('products'); }}><i className="fas fa-tshirt"></i> Sản phẩm</a>}
                    
                    {(isSuperAdmin || isSales) && <a href="#posts" className={activeTab === 'posts' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('posts'); }}><i className="fas fa-newspaper"></i> Tin tức & Xu hướng</a>}
                    
                    {(isSuperAdmin || isSales) && <a href="#users" className={activeTab === 'users' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('users'); }}><i className="fas fa-users"></i> Khách hàng</a>}
                    
                    {isSuperAdmin && <a href="#employees" className={activeTab === 'employees' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('employees'); }}><i className="fas fa-user-tie"></i> Nhân viên</a>}
                    {isSuperAdmin && <a href="#branches" className={activeTab === 'branches' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('branches'); }}><i className="fas fa-building"></i> Chi nhánh</a>}
                    {isSuperAdmin && <a href="#roles" className={activeTab === 'roles' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('roles'); }}><i className="fas fa-id-badge"></i> Chức vụ</a>}
                    
                    {(isSuperAdmin || isSales) && <a href="#orders" className={activeTab === 'orders' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('orders'); }}><i className="fas fa-shopping-bag"></i> Đơn hàng (Web)</a>}
                    
                    {(isSuperAdmin || isWarehouse) && <a href="#receipts" className={activeTab === 'receipts' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('receipts'); }}><i className="fas fa-arrow-down"></i> Phiếu Nhập</a>}
                    {(isSuperAdmin || isSales || isWarehouse) && <a href="#issues" className={activeTab === 'issues' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('issues'); }}><i className="fas fa-arrow-up"></i> Phiếu Xuất</a>}
                    
                    {(isSuperAdmin || isWarehouse) && <a href="#suppliers" className={activeTab === 'suppliers' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('suppliers'); }}><i className="fas fa-truck"></i> Nhà cung cấp</a>}
                    
                    {isSuperAdmin && <a href="#contacts" className={activeTab === 'contacts' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('contacts'); }}><i className="fas fa-envelope"></i> Phản hồi</a>}
                    
                    <a href="#!" onClick={(e) => { e.preventDefault(); localStorage.removeItem('currentUser'); localStorage.removeItem('isAdmin'); localStorage.removeItem('token'); window.location.href = '/login'; }}><i className="fas fa-sign-out-alt"></i> Đăng xuất</a>
                </nav>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div style={{display:'flex', alignItems:'center'}}>
                        <h2 style={{margin:0}}>Fashion Haven</h2>
                    </div>
                    <div className="user-info" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                        <div>Xin chào, <span style={{color: 'var(--accent)', fontWeight:'bold'}}>{adminName}</span></div>
                        <div style={{fontSize: '0.8rem', color: 'var(--muted)'}}>{jobTitle}</div>
                    </div>
                    <a href="/" className="btn btn-icon" style={{marginLeft:'15px'}} title="Về trang chủ"><i className="fas fa-home"></i></a>
                </header>

                <main>
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
                            <h3 style={{margin:0}}>Tổng quan hệ thống</h3>
                            <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i> Làm mới</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                            <div className="card" style={{padding:'20px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div><div style={{color:'var(--muted)', fontWeight:600, fontSize:'0.82rem', textTransform:'uppercase'}}>Sản phẩm</div><h2 style={{margin:'6px 0 0'}}>{stats.products}</h2></div>
                                    <div style={{width:'44px',height:'44px',background:'rgba(54,153,255,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)',fontSize:'1.3rem'}}><i className="fas fa-box"></i></div>
                                </div>
                            </div>
                            <div className="card" style={{padding:'20px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div><div style={{color:'var(--muted)', fontWeight:600, fontSize:'0.82rem', textTransform:'uppercase'}}>Khách hàng</div><h2 style={{margin:'6px 0 0'}}>{stats.users}</h2></div>
                                    <div style={{width:'44px',height:'44px',background:'rgba(27,197,189,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--success)',fontSize:'1.3rem'}}><i className="fas fa-users"></i></div>
                                </div>
                            </div>
                            <div className="card" style={{padding:'20px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div><div style={{color:'var(--muted)', fontWeight:600, fontSize:'0.82rem', textTransform:'uppercase'}}>Đơn hàng</div><h2 style={{margin:'6px 0 0'}}>{stats.orders}</h2></div>
                                    <div style={{width:'44px',height:'44px',background:'rgba(255,168,0,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--warning)',fontSize:'1.3rem'}}><i className="fas fa-shopping-bag"></i></div>
                                </div>
                            </div>
                            <div className="card" style={{padding:'20px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div><div style={{color:'var(--muted)', fontWeight:600, fontSize:'0.82rem', textTransform:'uppercase'}}>Chờ xử lý</div><h2 style={{margin:'6px 0 0', color:'var(--warning)'}}>{orders.filter(o => o.status === 'PENDING').length}</h2></div>
                                    <div style={{width:'44px',height:'44px',background:'rgba(245,158,11,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--warning)',fontSize:'1.3rem'}}><i className="fas fa-clock"></i></div>
                                </div>
                            </div>
                            <div className="card" style={{padding:'20px', gridColumn: 'span 2'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div><div style={{color:'var(--muted)', fontWeight:600, fontSize:'0.82rem', textTransform:'uppercase'}}>Tổng doanh thu</div><h2 style={{margin:'6px 0 0', color:'var(--info)'}}>{formatPrice(stats.revenue)}</h2></div>
                                    <div style={{width:'44px',height:'44px',background:'rgba(99,102,241,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--info)',fontSize:'1.3rem'}}><i className="fas fa-wallet"></i></div>
                                </div>
                            </div>
                        </div>

                        {products.filter(p => (p.quantity || 0) <= 5).length > 0 && (
                        <div className="low-stock-alert">
                            <div className="low-stock-header">
                                <i className="fas fa-exclamation-triangle"></i>
                                <strong>Cảnh báo: Tồn kho thấp</strong>
                                <span className="badge status-danger">{products.filter(p => (p.quantity || 0) <= 5).length} sản phẩm</span>
                            </div>
                            <div className="low-stock-list">
                                {products.filter(p => (p.quantity || 0) <= 5).map((p, i) => (
                                <div key={i} className="low-stock-item">
                                    <img src={p.image || '/images/ao-thun-nu.png'} alt="" className="product-img" />
                                    <span>{p.name}</span>
                                    <span className="badge status-danger">Còn {p.quantity || 0}</span>
                                </div>
                                ))}
                            </div>
                        </div>
                        )}

                        <div className="card">
                            <div style={{padding:'18px 20px', borderBottom:'1px solid var(--border)', fontWeight:700}}>🕐 5 Đơn hàng gần nhất</div>
                            <table>
                                <thead><tr><th>Mã ĐH</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
                                <tbody>
                                    {orders.slice(-5).reverse().map((o, i) => (
                                    <tr key={i}>
                                        <td>#{o.id}</td>
                                        <td>{o.customerName || o.name || 'N/A'}</td>
                                        <td><strong>{formatPrice(o.total || 0)}</strong></td>
                                        <td><span className={`badge ${o.status === 'Hoàn thành' ? 'status-success' : o.status === 'Đã hủy' ? 'status-danger' : 'status-warning'}`}>{o.status}</span></td>
                                    </tr>
                                    ))}
                                    {orders.length === 0 && <tr><td colSpan={4} style={{textAlign:'center'}}>Chưa có đơn hàng nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* PRODUCTS TAB */}
                    {activeTab === 'products' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý sản phẩm</h3>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                                <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}><i className="fas fa-plus"></i> Thêm Sản Phẩm</button>
                            </div>
                        </div>

                        {/* Thanh tìm kiếm + bộ lọc */}
                        <div style={{display:'flex', gap:'10px', marginBottom:'8px', flexWrap:'wrap', alignItems:'center'}}>
                            <SearchBar value={searchProduct} onChange={v => { setSearchProduct(v); setProductPage(1); }} placeholder="Tìm theo tên sản phẩm..." />
                            <select
                                className="status-select"
                                value={adminCategoryFilter}
                                onChange={e => { setAdminCategoryFilter(e.target.value); setProductPage(1); }}
                                style={{minWidth:'160px'}}
                            >
                                <option value="all">🏷️ Tất cả danh mục</option>
                                {categories.map((c, i) => (
                                    <option key={i} value={c.name.toLowerCase()}>🏷️ {c.name}</option>
                                ))}
                            </select>
                            <select
                                className="status-select"
                                value={adminStockFilter}
                                onChange={e => { setAdminStockFilter(e.target.value); setProductPage(1); }}
                                style={{minWidth:'140px'}}
                            >
                                <option value="all">📦 Tất cả tồn kho</option>
                                <option value="ok">✅ Còn hàng (&gt;5)</option>
                                <option value="low">⚠️ Sắp hết (&le;5)</option>
                                <option value="out">🚫 Hết hàng (=0)</option>
                            </select>
                            {(searchProduct || adminCategoryFilter !== 'all' || adminStockFilter !== 'all') && (
                                <button className="btn-refresh" style={{color:'var(--danger)'}} onClick={() => { setSearchProduct(''); setAdminCategoryFilter('all'); setAdminStockFilter('all'); setProductPage(1); }} title="Xóa bộ lọc">
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>

                        <div className="result-count">
                            {filteredProducts.length !== products.length
                                ? `Tìm thấy ${filteredProducts.length} / ${products.length} sản phẩm`
                                : `Tổng: ${products.length} sản phẩm`}
                        </div>

                        <div className="card">
                            <table>
                                <thead>
                                    <tr><th>#</th><th>Hình ảnh & Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Hành động</th></tr>
                                </thead>
                                <tbody>
                                    {paginate(filteredProducts, productPage).map((p, index) => (
                                    <tr key={index}>
                                        <td>{p.id}</td>
                                        <td><div style={{display:'flex', alignItems:'center', gap:'10px'}}><img src={p.image || '/images/ao-thun-nu.png'} className="product-img" alt="" /><span>{p.name}</span></div></td>
                                        <td><span className="badge status-info" style={{textTransform:'capitalize'}}>{p.categoryName || p.category || 'N/A'}</span></td>
                                        <td>{formatPrice(p.price)}</td>
                                        <td><span className={`badge ${(p.quantity||0) > 10 ? 'status-success' : (p.quantity||0) > 0 ? 'status-warning' : 'status-danger'}`}>{p.quantity || 0}</span></td>
                                        <td><div className="action-btns"><button className="btn btn-edit" onClick={() => { setEditingProduct(p); setShowProductModal(true); }}><i className="fas fa-pen"></i> Sửa</button><button className="btn btn-delete" onClick={() => handleDeleteProduct(p.id)}><i className="fas fa-trash"></i> Xóa</button></div></td>
                                    </tr>
                                    ))}
                                    {filteredProducts.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy sản phẩm nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {totalPages(filteredProducts) > 1 && <PaginationBar current={productPage} total={totalPages(filteredProducts)} onChange={setProductPage} />}
                    </section>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý Khách hàng</h3>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                                <button className="btn btn-primary" onClick={() => { setEditingUser(null); setShowUserModal(true); }}><i className="fas fa-user-plus"></i> Thêm Khách Hàng</button>
                            </div>
                        </div>
                        <SearchBar value={searchUser} onChange={v => { setSearchUser(v); setUserPage(1); }} placeholder="Tìm theo tên, email, số điện thoại..." />
                        <div className="result-count">{filteredUsers.length !== users.length ? `Tìm thấy ${filteredUsers.length} / ${users.length} khách hàng` : `Tổng: ${users.length} khách hàng`}</div>
                        <div className="card">
                            <table>
                                <thead><tr><th>#</th><th>Tên</th><th>Email</th><th>SĐT</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {paginate(filteredUsers, userPage).map((u, index) => (
                                    <tr key={index}>
                                        <td>{u.id}</td>
                                        <td><strong>{u.name}</strong></td>
                                        <td>{u.email}</td>
                                        <td>{u.phone || 'N/A'}</td>
                                        <td><div className="action-btns"><button className="btn btn-edit" onClick={() => { setEditingUser(u); setShowUserModal(true); }}><i className="fas fa-pen"></i> Sửa</button><button className="btn btn-delete" onClick={() => handleDeleteUser(u.id)}><i className="fas fa-trash"></i> Xóa</button></div></td>
                                    </tr>
                                    ))}
                                    {filteredUsers.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy khách hàng nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {totalPages(filteredUsers) > 1 && <PaginationBar current={userPage} total={totalPages(filteredUsers)} onChange={setUserPage} />}
                    </section>
                    )}

                    {/* ORDERS TAB */}
                    {activeTab === 'orders' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý đơn hàng</h3>
                            <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                        </div>
                        <SearchBar value={searchOrder} onChange={v => { setSearchOrder(v); setOrderPage(1); }} placeholder="Tìm theo tên khách, mã đơn hàng..." />
                        <div className="result-count">{filteredOrders.length !== orders.length ? `Tìm thấy ${filteredOrders.length} / ${orders.length} đơn hàng` : `Tổng: ${orders.length} đơn hàng`}</div>
                        <div className="card">
                            <table>
                                <thead><tr><th>Mã ĐH</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {paginate(filteredOrders, orderPage).map((o, index) => (
                                    <tr key={index}>
                                        <td>#{o.id}</td>
                                        <td><div style={{fontWeight:600}}>{o.customerName || o.name}</div><small style={{color:'var(--muted)'}}>{o.customerPhone || o.phone}</small></td>
                                        <td>{formatPrice(o.total || 0)}</td>
                                        <td>
                                          <select className="status-select" value={o.status} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}>
                                            <option value="PENDING">Chờ xử lý</option>
                                            <option value="Đang giao">Đang giao</option>
                                            <option value="Hoàn thành">Hoàn thành</option>
                                            <option value="Đã hủy">Đã hủy</option>
                                          </select>
                                        </td>
                                        <td><button className="btn btn-delete" onClick={() => handleDeleteOrder(o.id)}><i className="fas fa-trash"></i> Xóa</button></td>
                                    </tr>
                                    ))}
                                    {filteredOrders.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy đơn hàng nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {totalPages(filteredOrders) > 1 && <PaginationBar current={orderPage} total={totalPages(filteredOrders)} onChange={setOrderPage} />}
                    </section>
                    )}

                    {/* SUPPLIERS TAB */}
                    {activeTab === 'suppliers' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý Nhà cung cấp</h3>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                                <button className="btn btn-primary" onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }}><i className="fas fa-plus"></i> Thêm Nhà Cung Cấp</button>
                            </div>
                        </div>
                        <SearchBar value={searchSupplier} onChange={setSearchSupplier} placeholder="Tìm theo tên, số điện thoại..." />
                        <div className="result-count">{filteredSuppliers.length !== suppliers.length ? `Tìm thấy ${filteredSuppliers.length} / ${suppliers.length} nhà cung cấp` : `Tổng: ${suppliers.length} nhà cung cấp`}</div>
                        <div className="card">
                            <table>
                                <thead><tr><th>#</th><th>Tên</th><th>Liên hệ</th><th>Sản phẩm</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {filteredSuppliers.map((s, index) => (
                                    <tr key={index}>
                                        <td>{s.id}</td>
                                        <td><strong>{s.name}</strong></td>
                                        <td>{s.phone}<br/><small style={{color:'var(--muted)'}}>{s.email}</small></td>
                                        <td>{s.products}</td>
                                        <td><div className="action-btns"><button className="btn btn-edit" onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }}><i className="fas fa-pen"></i> Sửa</button><button className="btn btn-delete" onClick={() => handleDeleteSupplier(s.id)}><i className="fas fa-trash"></i> Xóa</button></div></td>
                                    </tr>
                                    ))}
                                    {filteredSuppliers.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy nhà cung cấp nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* CONTACTS TAB */}
                    {activeTab === 'contacts' && (
                    <section className="section">
                        <h3>Phản hồi từ Khách Hàng</h3>
                        <div className="card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Người gửi</th>
                                        <th>Nội dung</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((c, index) => (
                                    <tr key={index}>
                                        <td style={{whiteSpace:'nowrap'}}>{c.date || 'Hôm nay'}</td>
                                        <td style={{whiteSpace:'nowrap'}}>
                                            <div style={{fontWeight:600}}>{c.name}</div>
                                            <small style={{color:'var(--muted)'}}>{c.email}</small>
                                        </td>
                                        <td>{c.message}</td>
                                        <td>
                                          <button className="btn btn-delete" onClick={() => handleDeleteContact(c.id)}><i className="fas fa-trash"></i> Xóa</button>
                                        </td>
                                    </tr>
                                    ))}
                                    {contacts.length === 0 && (
                                        <tr><td colSpan={4} style={{textAlign: 'center'}}>Chưa có thư liên hệ nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* POSTS TAB (News/Trends) */}
                    {activeTab === 'posts' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý Tin Tức & Xu Hướng</h3>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                                <button className="btn btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); }}><i className="fas fa-plus"></i> Thêm Bài Viết</button>
                            </div>
                        </div>
                        <SearchBar value={searchPost} onChange={setSearchPost} placeholder="Tìm theo tiêu đề bài viết..." />
                        <div className="result-count">{filteredPosts.length !== posts.length ? `Tìm thấy ${filteredPosts.length} / ${posts.length} bài viết` : `Tổng: ${posts.length} bài viết`}</div>
                        <div className="card">
                            <table>
                                <thead><tr><th>#</th><th>Hình ảnh</th><th>Tiêu đề</th><th>Phân loại</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {filteredPosts.map((p, index) => (
                                    <tr key={index}>
                                        <td>{p.id}</td>
                                        <td><img src={p.image} className="product-img" alt="" /></td>
                                        <td><strong>{p.title}</strong><br/><small style={{color:'var(--muted)'}}>{p.description?.substring(0, 50)}...</small></td>
                                        <td><span className={p.type==='news' ? 'badge status-success' : 'badge status-warning'}>{p.type === 'news' ? 'Tin tức' : 'Xu hướng'}</span></td>
                                        <td><div className="action-btns"><button className="btn btn-edit" onClick={() => { setEditingPost(p); setShowPostModal(true); }}><i className="fas fa-pen"></i> Sửa</button><button className="btn btn-delete" onClick={() => handleDeletePost(p.id)}><i className="fas fa-trash"></i> Xóa</button></div></td>
                                    </tr>
                                    ))}
                                    {filteredPosts.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy bài viết nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* BRANCHES TAB */}
                    {activeTab === 'branches' && (
                    <section className="section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h3>Quản lý Chi nhánh</h3>
                            <button className="btn btn-primary" onClick={() => { setEditingBranch(null); setShowBranchModal(true); }}>
                              <i className="fas fa-plus"></i> Thêm Chi nhánh
                            </button>
                        </div>
                        <div className="card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tên Chi nhánh</th>
                                        <th>Địa chỉ</th>
                                        <th>Điện thoại</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branches.map((b, index) => (
                                    <tr key={index}>
                                        <td>{b.id}</td>
                                        <td><strong>{b.name}</strong></td>
                                        <td>{b.address}</td>
                                        <td>{b.phone}</td>
                                        <td>
                                          <div className="action-btns">
                                            <button className="btn btn-edit" onClick={() => { setEditingBranch(b); setShowBranchModal(true); }}><i className="fas fa-pen"></i> Sửa</button>
                                            <button className="btn btn-delete" onClick={() => handleDeleteBranch(b.id)}><i className="fas fa-trash"></i> Xóa</button>
                                          </div>
                                        </td>
                                    </tr>
                                    ))}
                                    {branches.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center'}}>Chưa có chi nhánh nào!</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* ROLES TAB */}
                    {activeTab === 'roles' && (
                    <section className="section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h3>Quản lý Chức vụ</h3>
                            <button className="btn btn-primary" onClick={() => { setEditingRole(null); setShowRoleModal(true); }}>
                              <i className="fas fa-plus"></i> Thêm Chức vụ
                            </button>
                        </div>
                        <div className="card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tên Chức vụ</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map((r, index) => (
                                    <tr key={index}>
                                        <td>{r.id}</td>
                                        <td><strong>{r.name}</strong></td>
                                        <td>
                                          <div className="action-btns">
                                            <button className="btn btn-edit" onClick={() => { setEditingRole(r); setShowRoleModal(true); }}><i className="fas fa-pen"></i> Sửa</button>
                                            <button className="btn btn-delete" onClick={() => handleDeleteRole(r.id)}><i className="fas fa-trash"></i> Xóa</button>
                                          </div>
                                        </td>
                                    </tr>
                                    ))}
                                    {roles.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center'}}>Chưa có chức vụ nào!</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* EMPLOYEES TAB */}
                    {activeTab === 'employees' && (
                    <section className="section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3>Quản lý Nhân viên</h3>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button className="btn-refresh" onClick={loadAllData}><i className="fas fa-sync-alt"></i></button>
                                <button className="btn btn-primary" onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}><i className="fas fa-plus"></i> Thêm Nhân viên</button>
                            </div>
                        </div>
                        <SearchBar value={searchEmployee} onChange={v => { setSearchEmployee(v); setEmployeePage(1); }} placeholder="Tìm theo tên, số điện thoại, chi nhánh..." />
                        <div className="result-count">{filteredEmployees.length !== employees.length ? `Tìm thấy ${filteredEmployees.length} / ${employees.length} nhân viên` : `Tổng: ${employees.length} nhân viên`}</div>
                        <div className="card">
                            <table>
                                <thead><tr><th>#</th><th>Họ Tên</th><th>Chức vụ / Chi nhánh</th><th>Liên hệ</th><th>Tài khoản</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {paginate(filteredEmployees, employeePage).map((e, index) => (
                                    <tr key={index}>
                                        <td>{e.id}</td>
                                        <td><strong>{e.name}</strong></td>
                                        <td><span className="badge status-success" style={{marginBottom:'5px'}}>{e.roleName}</span><br/><small>{e.branchName}</small></td>
                                        <td>{e.phone}<br/><small style={{color:'var(--muted)'}}>{e.address}</small></td>
                                        <td>{e.username ? <span className="badge status-warning">{e.username}</span> : 'Chưa có'}</td>
                                        <td><div className="action-btns"><button className="btn btn-edit" onClick={() => { setEditingEmployee(e); setShowEmployeeModal(true); }}><i className="fas fa-pen"></i> Sửa</button><button className="btn btn-delete" onClick={() => handleDeleteEmployee(e.id)}><i className="fas fa-trash"></i> Xóa</button></div></td>
                                    </tr>
                                    ))}
                                    {filteredEmployees.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>Không tìm thấy nhân viên nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {totalPages(filteredEmployees) > 1 && <PaginationBar current={employeePage} total={totalPages(filteredEmployees)} onChange={setEmployeePage} />}
                    </section>
                    )}

                    {/* RECEIPTS TAB */}
                    {activeTab === 'receipts' && (
                    <section className="section">
                        <h3>Danh sách Phiếu Nhập Hàng</h3>
                        <div className="card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã Phiếu</th>
                                        <th>Nhân viên lập</th>
                                        <th>Nhà cung cấp</th>
                                        <th>Ngày nhập</th>
                                        <th>Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importReceipts.map((r, index) => (
                                    <tr key={index}>
                                        <td>#{r.id}</td>
                                        <td>{r.employeeName}</td>
                                        <td>{r.supplierName}</td>
                                        <td>{r.date}</td>
                                        <td><strong>{formatPrice(r.total)}</strong></td>
                                    </tr>
                                    ))}
                                    {importReceipts.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center'}}>Chưa có phiếu nhập nào!</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                    {/* ISSUES TAB */}
                    {activeTab === 'issues' && (
                    <section className="section">
                        <h3>Danh sách Phiếu Xuất Hàng</h3>
                        <div className="card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã Phiếu</th>
                                        <th>Nhân viên lập</th>
                                        <th>Khách hàng</th>
                                        <th>Ngày xuất</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exportReceipts.map((r, index) => (
                                    <tr key={index}>
                                        <td>#{r.id}</td>
                                        <td>{r.employeeName || 'Hệ thống'}</td>
                                        <td>{r.customerName}</td>
                                        <td>{r.date}</td>
                                        <td><strong>{formatPrice(r.total)}</strong></td>
                                        <td><span className="badge status-success">{r.status}</span></td>
                                    </tr>
                                    ))}
                                    {exportReceipts.length === 0 && <tr><td colSpan={6} style={{textAlign: 'center'}}>Chưa có phiếu xuất nào!</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    )}

                </main>
            </div>
        </div>

        {/* --- TẤT CẢ CÁC MODAL ĐƯỢC ĐẶT Ở ĐÂY DÙNG CHUNG CLASS MODAL ĐÃ CSS LẠI --- */}

        {/* MODAL SẢN PHẨM */}
        {showProductModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
                <button className="modal-close" onClick={() => setShowProductModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tên Sản Phẩm</label>
                      <input type="text" name="name" defaultValue={editingProduct?.name || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Danh Mục</label>
                      <select name="categoryId" defaultValue={editingProduct?.categoryId || (categories.length > 0 ? categories[0].id : 1)} required>
                        {categories.map((c, i) => (
                           <option key={i} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Giá Bán (VNĐ)</label>
                      <input type="number" name="price" defaultValue={editingProduct?.price || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Tồn Kho</label>
                      <input type="number" name="stock" defaultValue={editingProduct?.quantity || 0} required />
                    </div>
                    <div className="form-group">
                      <label>Hình Ảnh (URL)</label>
                      <input type="text" name="image" defaultValue={editingProduct?.image || ''} placeholder="/images/sp.jpg" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowProductModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Sản Phẩm</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL BÀI VIẾT */}
        {showPostModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingPost ? 'Sửa Bài Viết' : 'Thêm Bài Viết Mới'}</h2>
                <button className="modal-close" onClick={() => setShowPostModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSavePost}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tiêu đề</label>
                      <input type="text" name="title" defaultValue={editingPost?.title || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Loại bài viết</label>
                      <select name="type" defaultValue={editingPost?.type || 'news'}>
                          <option value="news">Tin tức</option>
                          <option value="trend">Xu hướng</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mô tả ngắn</label>
                      <textarea name="description" defaultValue={editingPost?.description || ''} required rows={3}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Đường dẫn hình ảnh</label>
                      <input type="text" name="image" defaultValue={editingPost?.image || ''} placeholder="/images/tin-tuc.jpg" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowPostModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Bài Viết</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NGƯỜI DÙNG */}
        {showUserModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingUser ? 'Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}</h2>
                <button className="modal-close" onClick={() => setShowUserModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Họ và Tên</label>
                      <input type="text" name="name" defaultValue={editingUser?.name || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Email (Tài khoản)</label>
                      <input type="email" name="email" defaultValue={editingUser?.email || ''} required />
                    </div>
                    <div className="form-group">
                      <label>{editingUser ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu'}</label>
                      <input type="password" name="password" required={!editingUser} />
                    </div>
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input type="text" name="phone" defaultValue={editingUser?.phone || ''} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowUserModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Khách Hàng</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NHÀ CUNG CẤP */}
        {showSupplierModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingSupplier ? 'Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}</h2>
                <button className="modal-close" onClick={() => setShowSupplierModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveSupplier}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tên Nhà Cung Cấp</label>
                      <input type="text" name="name" defaultValue={editingSupplier?.name || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input type="text" name="phone" defaultValue={editingSupplier?.phone || ''} required />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowSupplierModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Nhà Cung Cấp</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CHI NHÁNH */}
        {showBranchModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingBranch ? 'Sửa Chi Nhánh' : 'Thêm Chi Nhánh'}</h2>
                <button className="modal-close" onClick={() => setShowBranchModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveBranch}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tên Chi Nhánh</label>
                      <input type="text" name="name" defaultValue={editingBranch?.name || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Địa chỉ</label>
                      <input type="text" name="address" defaultValue={editingBranch?.address || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Điện thoại</label>
                      <input type="text" name="phone" defaultValue={editingBranch?.phone || ''} required />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowBranchModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Chi Nhánh</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CHỨC VỤ */}
        {showRoleModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingRole ? 'Sửa Chức Vụ' : 'Thêm Chức Vụ'}</h2>
                <button className="modal-close" onClick={() => setShowRoleModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveRole}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tên Chức Vụ</label>
                      <input type="text" name="name" defaultValue={editingRole?.name || ''} required />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowRoleModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Chức Vụ</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NHÂN VIÊN */}
        {showEmployeeModal && (
          <div className="modal-backdrop" style={{ display: 'flex' }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editingEmployee ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}</h2>
                <button className="modal-close" onClick={() => setShowEmployeeModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveEmployee}>
                <div className="modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                      <label>Họ Tên</label>
                      <input type="text" name="name" defaultValue={editingEmployee?.name || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Điện thoại</label>
                      <input type="text" name="phone" defaultValue={editingEmployee?.phone || ''} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Địa chỉ</label>
                      <input type="text" name="address" defaultValue={editingEmployee?.address || ''} required />
                    </div>
                    <div className="form-group">
                      <label>Chức vụ</label>
                      <select name="roleId" defaultValue={editingEmployee?.roleId || ''} required>
                          <option value="">-- Chọn chức vụ --</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Chi nhánh</label>
                      <select name="branchId" defaultValue={editingEmployee?.branchId || ''} required>
                          <option value="">-- Chọn chi nhánh --</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <hr style={{margin: '10px 0', border: 'none', borderTop: '1px solid #ddd'}}/>
                      <label style={{color: 'var(--primary)', fontWeight: 600}}>Tài khoản đăng nhập (Tùy chọn)</label>
                    </div>
                    <div className="form-group">
                      <label>Tên đăng nhập (Username)</label>
                      <input type="text" name="username" defaultValue={editingEmployee?.username || ''} placeholder="Tên đăng nhập" />
                    </div>
                    <div className="form-group">
                      <label>Mật khẩu (Để trống nếu không đổi)</label>
                      <input type="password" name="password" placeholder={editingEmployee ? '***' : 'Mật khẩu'} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowEmployeeModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Nhân Viên</button>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
};

export default Admin;
