import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/login', form);
      localStorage.setItem('alzayn_admin_token', res.data.token);
      toast.success('Welcome, Admin');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-3">
          <img src="/logo.jpg" alt="Al-Zayn Hub" className="h-14 w-14 rounded-full object-cover" />
        </div>
        <h1 className="font-display font-bold text-2xl mb-1 text-center">
          <span className="text-dark">Al-Zayn</span><span className="text-primary"> Hub</span>
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">Admin Panel Login</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input required className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="admin123" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-6">Default credentials: admin / admin123</p>
      </div>
    </div>
  );
}
