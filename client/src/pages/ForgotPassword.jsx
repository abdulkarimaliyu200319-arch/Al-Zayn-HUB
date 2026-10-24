import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message);
      setSent(true);
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="font-display font-bold text-2xl mb-1">Forgot Password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div className="text-center py-6">
            <p className="text-gray-600">If that email exists, a reset link has been sent. Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <p className="text-sm text-center text-gray-500 mt-6">
          Remembered it? <Link to="/login" className="text-primary font-semibold">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
