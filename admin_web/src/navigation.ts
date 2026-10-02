export const navigationSections = [
  [['dashboard', 'Tổng quan', 'dashboard'], ['products', 'Sản phẩm & Tồn kho', 'inventory_2'], ['orders', 'Quản lý đơn hàng', 'local_shipping'], ['customers', 'Khách hàng', 'diamond'], ['employees', 'Nhân viên & Quyền truy cập', 'badge'], ['imports', 'Phiếu nhập hàng', 'move_to_inbox'], ['exports', 'Giao hàng', 'outbox'], ['suppliers', 'Nhà cung cấp', 'store']],
  [['posts', 'Bài viết', 'article'], ['contacts', 'Liên hệ khách hàng', 'mail'], ['branches', 'Chi nhánh', 'business'], ['roles', 'Chức vụ', 'admin_panel_settings']],
  [['reports', 'Báo cáo (chưa hỗ trợ)', 'analytics'], ['settings', 'Cài đặt (chưa hỗ trợ)', 'settings']],
] as const;

export const tabLabels: Record<string, string> = Object.fromEntries(navigationSections.flat().map(([id, label]) => [id, label]));
