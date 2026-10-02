export const API_URL = (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`).replace(/\/$/, '');
export const SERVER_URL = API_URL.replace(/\/api$/, '');
export type InternalRole = 'staff' | 'admin';
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function apiRequest(path: string, options: RequestInit = {}) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${path}`, {
      ...options, signal: options.signal ?? controller.signal,
      headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(data?.error ?? 'Không thể xử lý yêu cầu.', response.status);
    if (data === null) throw new ApiError('Phản hồi máy chủ không hợp lệ.', response.status);
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Không kết nối được máy chủ. Vui lòng thử lại.', 0);
  } finally { clearTimeout(timeout); }
}
export function clearSession() { ['token', 'currentUser', 'isAdmin'].forEach(key => localStorage.removeItem(key)); }
