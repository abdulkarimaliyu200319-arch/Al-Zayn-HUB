import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const configured = !!CLIENT_ID && !CLIENT_ID.startsWith('your_');

let sdkPromise = null;
function loadGoogleSdk() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { sdkPromise = null; reject(new Error('Google script failed to load')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

// "Continue with Google" - uses Google's official button; the server verifies the token it returns.
export default function GoogleButton({ referralCode = '' }) {
  const holder = useRef(null);
  const referralRef = useRef(referralCode);
  referralRef.current = referralCode; // always the latest value typed in the form
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (!configured) return undefined;
    let cancelled = false;

    const onCredential = async (response) => {
      try {
        const res = await api.post('/auth/google', { credential: response.credential, referralCode: referralRef.current || undefined });
        login(res.data.token, res.data.user);
        toast.success('Welcome!');
        navigate('/dashboard');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google sign-in failed');
      }
    };

    loadGoogleSdk()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential });
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, holder.current.offsetWidth || 360),
        });
      })
      .catch(() => toast.error('Could not load Google sign-in. Check your internet connection.'));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!configured) {
    return (
      <button
        type="button"
        onClick={() => toast('Google sign-in is not set up yet. Add VITE_GOOGLE_CLIENT_ID to client/.env and restart.', { icon: 'ℹ️' })}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 mb-5 font-medium hover:bg-gray-50"
      >
        <FcGoogle size={20} /> Continue with Google
      </button>
    );
  }
  return <div ref={holder} className="w-full flex justify-center mb-5 min-h-[44px]" />;
}
