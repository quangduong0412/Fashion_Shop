import { useCallback, useEffect, useState } from 'react';
import './Admin.css';
import { ApiError, apiRequest, clearSession } from '../api';
import type { InternalRole } from '../api';
import Sidebar from '../components/Sidebar';
import { tabLabels } from '../navigation';
import Header from '../components/Header';
import DashboardView from '../components/DashboardView';
import ProductsView from '../components/ProductsView';
import ProductEditorModal from '../components/ProductEditorModal';
import OrdersView from '../components/OrdersView';
import CustomersView from '../components/CustomersView';
import CategoriesView from '../components/CategoriesView';
import EmployeesView from '../components/EmployeesView';
import SuppliersView from '../components/SuppliersView';
import ImportsView from '../components/ImportsView';
import ExportsView from '../components/ExportsView';
import ReportsView from '../components/ReportsView';
import SettingsView from '../components/SettingsView';
import VouchersView from '../components/VouchersView';
import PostsView from '../components/PostsView';
import ContactsView from '../components/ContactsView';
import BranchesView from '../components/BranchesView';
import RolesView from '../components/RolesView';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<any>(null);
  const [principal, setPrincipal] = useState<{ id: number; name: string; jobTitle: string; role: InternalRole } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const showError = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.href = '/login'; return; }
    setError(cause instanceof Error ? cause.message : 'Không thể thực hiện thao tác.');
  }, []);
  const loadData = useCallback(async () => {
    setRefreshing(true); setError('');
    try {
      const [profile, next] = await Promise.all([apiRequest('/users/profile'), apiRequest('/admin')]);
      if (!['staff', 'admin'].includes(profile.role)) throw new Error('Tài khoản không có quyền truy cập trang quản trị.');
      const current = { id: profile.id, name: profile.name ?? profile.TenKhach, jobTitle: profile.jobTitle, role: next.access.role };
      setPrincipal(current); setData(next);
      localStorage.setItem('currentUser', JSON.stringify(current));
      localStorage.setItem('isAdmin', 'true');
      setActiveTab(tab => next.access.allowedTabs.includes(tab) ? tab : next.access.allowedTabs[0]);
    } catch (cause) { showError(cause); }
    finally { setRefreshing(false); }
  }, [showError]);
  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return; }
    let active = true;
    queueMicrotask(() => { if (active) void loadData(); });
    return () => { active = false; };
  }, [loadData]);

  const mutate = async (path: string, method: string, body?: unknown) => {
    const result = await apiRequest(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    setNotice(result.message ?? 'Đã lưu thay đổi.');
    void loadData();
    return result;
  };
  const save = (resource: string, record: any) => mutate(`/${resource}${record.id ? `/${record.id}` : ''}`, record.id ? 'PUT' : 'POST', record);
  const legacySave = (resource: string, record: any) => { void save(resource, record).catch(showError); };
  const remove = (resource: string, id: number, message: string) => {
    if (window.confirm(message)) void mutate(`/${resource}/${id}`, 'DELETE').catch(showError);
  };
  const isAdmin = principal?.role === 'admin';

  if (!data || !principal) return <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6"><div className="bg-white border rounded-xl p-8 max-w-xl">
    <h1 className="text-2xl font-bold">Fashion Haven · Quản trị</h1><p className="mt-3 text-gray-600">{error || 'Đang kiểm tra phiên và tải dữ liệu…'}</p>
    {!!error && <button onClick={() => void loadData()} className="mt-4 px-4 py-2 bg-red-700 text-white rounded-lg">Thử lại</button>}
  </div></main>;
  const stats = data.statistics;
  return <div className="min-h-screen bg-gray-50 text-gray-900">
    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} allowedTabs={data.access.allowedTabs} />
    <div className="md:pl-64">
      <Header adminName={principal.name} jobTitle={principal.role === 'admin' ? 'Quản trị viên' : principal.jobTitle || 'Nhân viên'} onRefresh={() => void loadData()} refreshing={refreshing} />
      <main className="pt-24 p-4 sm:p-6 md:pt-28 space-y-4">
        <label className="block md:hidden text-sm font-semibold">Chức năng<select className="block mt-1 w-full border rounded-lg p-2 bg-white" value={activeTab} onChange={event => setActiveTab(event.target.value)}>{data.access.allowedTabs.map((tab: string) => <option key={tab} value={tab}>{tabLabels[tab]}</option>)}</select></label>
        {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</p>}
        {notice && <p role="status" className="bg-white border text-gray-700 p-3 rounded-lg text-sm">{notice}</p>}
        {activeTab === 'dashboard' && isAdmin && <DashboardView stats={stats} orders={data.orders} fetchedAt={data.fetchedAt} onOpenOrders={() => setActiveTab('orders')} />}
        {activeTab === 'products' && <ProductsView products={data.products} categories={data.categories} searchProduct={searchProduct} setSearchProduct={setSearchProduct} canManage={isAdmin}
          openProductModal={product => setEditingProduct(product || {})} handleDeleteProduct={id => remove('products', id, 'Xóa sản phẩm chưa có tồn/lịch sử? Có thể chọn Tạm ngừng để giữ dữ liệu.')} />}
        {activeTab === 'orders' && <OrdersView isAdmin={isAdmin} onChanged={() => void loadData()} />}
        {isAdmin && <>
          {activeTab === 'customers' && <CustomersView onChanged={() => void loadData()} />}
          {activeTab === 'categories' && <CategoriesView categories={data.categories} onSaved={() => void loadData()} onError={showError} />}
          {activeTab === 'employees' && <EmployeesView employees={data.employees} branches={data.branches} roles={data.roles} currentUserId={principal.id}
            onSave={async employee => { await save('employees', employee); }} onDelete={async id => { await mutate(`/employees/${id}`, 'DELETE'); }} />}
          {activeTab === 'suppliers' && <SuppliersView suppliers={data.suppliers} onSave={record => legacySave('suppliers', record)} onDelete={id => remove('suppliers', id, 'Xóa nhà cung cấp chưa có lịch sử?')} />}
          {activeTab === 'imports' && <ImportsView suppliers={data.suppliers} warehouses={data.warehouses} onChanged={() => void loadData()} />}
          {activeTab === 'exports' && <ExportsView exports={data.exportReceipts} />}
          {activeTab === 'posts' && <PostsView posts={data.posts} onSave={async record => { await save('posts', record); }} onDelete={async id => { await mutate(`/posts/${id}`, 'DELETE'); }} />}
          {activeTab === 'contacts' && <ContactsView contacts={data.contacts} onDelete={async id => { await mutate(`/contacts/${id}`, 'DELETE'); }} />}
          {activeTab === 'branches' && <BranchesView branches={data.branches} onSave={record => legacySave('branches', record)} onDelete={id => remove('branches', id, 'Xóa chi nhánh chưa có nhân viên/giao dịch?')} />}
          {activeTab === 'roles' && <RolesView roles={data.roles} onSave={record => legacySave('roles', record)} onDelete={id => remove('roles', id, 'Xóa chức vụ chưa được sử dụng?')} />}
          {activeTab === 'vouchers' && <VouchersView products={data.products} categories={data.categories} />}{activeTab === 'reports' && <ReportsView />}{activeTab === 'settings' && <SettingsView />}
        </>}
      </main>
    </div>
    {isAdmin && editingProduct && <ProductEditorModal product={editingProduct} categories={data.categories} warehouses={data.warehouses} suppliers={data.suppliers}
      onClose={() => setEditingProduct(null)} onSaved={() => { setEditingProduct(null); setNotice('Đã lưu sản phẩm và tồn kho.'); void loadData(); }} />}
  </div>;
}
