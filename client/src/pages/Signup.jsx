import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import GoogleButton from '../components/GoogleButton';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', referralCode: searchParams.get('ref') || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      toast.success(res.data.message);
      navigate('/verify-otp', { state: { userId: res.data.userId, email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="font-display font-bold text-2xl mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Join Al-Zayn Hub and start enjoying instant services.</p>

        <GoogleButton referralCode={form.referralCode} />

        <div className="flex items-center gap-3 mb-5 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" /> OR <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input name="name" required className="input-field" value={form.name} onChange={handleChange} placeholder="John Doe" />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" name="email" required className="input-field" value={form.email} onChange={handleChange} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input name="phone" required className="input-field" value={form.phone} onChange={handleChange} placeholder="080XXXXXXXX" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" name="password" required minLength={6} className="input-field" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="label">Referral Code (optional)</label>
            <input name="referralCode" className="input-field" value={form.referralCode} onChange={handleChange} placeholder="e.g JOHN1234" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-primary font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
