import React from 'react';
import toast from 'react-hot-toast';
import { FiCopy } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function Referral() {
  const { user } = useAuth();
  const link = `${window.location.origin}/signup?ref=${user?.referral_code}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Refer & Earn</h1>

      <div className="card bg-gradient-to-br from-primary to-blue-700 text-white text-center py-10 mb-6">
        <p className="text-sm text-blue-100 mb-2">Earn for every friend who signs up</p>
        <p className="font-display font-extrabold text-4xl text-accent">₦500</p>
        <p className="text-sm text-blue-100 mt-2">per successful referral</p>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Your Unique Referral Link</h3>
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="input-field bg-gray-50" />
          <button onClick={copy} className="btn-primary !py-3 !px-4"><FiCopy /></button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Your referral code: <strong>{user?.referral_code}</strong></p>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold mb-3">How it works</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Share your referral link with friends and family.</li>
          <li>They sign up using your link.</li>
          <li>₦500 is credited instantly to your wallet.</li>
        </ol>
      </div>
    </div>
  );
}
