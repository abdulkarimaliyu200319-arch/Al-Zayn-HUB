import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!state?.userId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <p className="text-gray-500">No pending verification. Please <a href="/signup" className="text-primary font-semibold">sign up</a> first.</p>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { userId: state.userId, code });
      login(res.data.token, res.data.user);
      toast.success('Account verified! Welcome to Al-Zayn Hub 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { userId: state.userId });
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error('Could not resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-sm text-center">
        <h1 className="font-display font-bold text-2xl mb-2">Verify your account</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code sent to <strong>{state.email}</strong></p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
            className="input-field text-center text-2xl tracking-[0.5em] font-bold"
            placeholder="------"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>
        <button onClick={resend} disabled={resending} className="text-sm text-primary font-semibold mt-5">
          {resending ? 'Resending...' : "Didn't get a code? Resend"}
        </button>
      </div>
    </div>
  );
}
