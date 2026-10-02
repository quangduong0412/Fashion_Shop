import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from '../api';
import './Login.css';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (loading) return; setError(''); setLoading(true);
    try {
      clearSession();
      const data = await apiRequest('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!['staff', 'admin'].includes(data.user.role)) throw new Error('Vui lòng dùng tài khoản nhân viên hoặc quản trị viên.');
      localStorage.setItem('token', data.token); localStorage.setItem('currentUser', JSON.stringify(data.user)); localStorage.setItem('isAdmin', 'true');
      navigate('/', { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.'); }
    finally { setLoading(false); }
  };
  return <main className="auth-container"><div className="auth-form"><h1>Fashion Haven</h1><p className="text-center mb-6 text-gray-500">Dành cho nhân viên và quản trị viên</p>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <form onSubmit={submit}><div className="form-group"><label htmlFor="login-name">Tên đăng nhập</label><input id="login-name" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required disabled={loading} /></div>
      <div className="form-group"><label htmlFor="login-password">Mật khẩu</label><input id="login-password" autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required disabled={loading} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form></div></main>;
}
