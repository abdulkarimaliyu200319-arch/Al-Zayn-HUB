import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import GoogleButton from '../components/GoogleButton';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresOtp) {
        toast('Please verify your account first', { icon: 'ℹ️' });
        navigate('/verify-otp', { state: { userId: data.userId, email: form.identifier } });
      } else {
        toast.error(data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="font-display font-bold text-2xl mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Login to access your Al-Zayn Hub dashboard.</p>

        <GoogleButton />

        <div className="flex items-center gap-3 mb-5 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" /> OR <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email or Phone</label>
            <input
              required
              className="input-field"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="you@example.com or 080XXXXXXXX"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-primary font-medium">Forgot Password?</Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Don't have an account? <Link to="/signup" className="text-primary font-semibold">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
