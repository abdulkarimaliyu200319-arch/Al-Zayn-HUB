import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const quickAmounts = [500, 1000, 2000, 5000, 10000];

export default function Wallet() {
  const { balance, refreshBalance } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const loadTxs = () => api.get('/wallet/transactions').then((res) => setTxs(res.data.transactions)).catch(() => {});

  useEffect(() => {
    loadTxs();
    // Handle redirect back from Monnify (works for wallet funding, shop orders and VPN purchases)
    let reference = searchParams.get('ref') || searchParams.get('paymentReference');
    if (reference) reference = reference.split('?')[0];
    if (reference && searchParams.get('verify')) {
      api.get(`/wallet/fund/verify/${encodeURIComponent(reference)}`).then((res) => {
        toast.success(res.data.message);
        refreshBalance();
        loadTxs();
        if (res.data.type === 'vpn') navigate('/dashboard/vpn');
        else if (res.data.type === 'shop') navigate('/dashboard/orders');
        else navigate('/dashboard/wallet', { replace: true }); // clear the URL so a refresh doesn't re-check
      }).catch((err) => {
        if (err.response?.status === 202) toast(err.response.data.message, { icon: '⏳', duration: 7000 });
        else toast.error(err.response?.data?.message || 'Could not verify payment');
        loadTxs();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fundWallet = async () => {
    if (!amount || amount < 100) return toast.error('Minimum funding amount is ₦100');
    setLoading(true);
    try {
      const res = await api.post('/wallet/fund/initialize', { amount: Number(amount) });
      window.location.href = res.data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initialize payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">My Wallet</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card bg-dark text-white flex flex-col justify-center">
          <p className="text-sm text-gray-300 mb-1">Current Balance</p>
          <p className="font-display font-extrabold text-4xl text-accent">₦{Number(balance).toLocaleString()}</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Fund Wallet</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {quickAmounts.map((a) => (
              <button key={a} onClick={() => setAmount(a)} className="px-3 py-1.5 rounded-full text-xs border border-gray-200 hover:border-primary hover:text-primary">
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            className="input-field mb-4"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={fundWallet} disabled={loading} className="btn-primary w-full">
            {loading ? 'Redirecting...' : 'Fund Wallet'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-2">Type</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 capitalize">{t.type}</td>
                  <td className="py-2">₦{t.amount.toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'success' ? 'bg-green-50 text-green-600' : t.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {txs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-gray-400">No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
