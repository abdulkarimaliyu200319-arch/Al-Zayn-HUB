import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function MyVPN() {
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refreshBalance } = useAuth();

  const load = () => {
    api.get('/vpn/my-subscription').then((res) => setSub(res.data.subscription)).catch(() => {});
    api.get('/vpn/plans').then((res) => setPlans(res.data.plans)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const renew = async (planId) => {
    setLoading(true);
    try {
      const res = await api.post('/vpn/subscribe/wallet', { planId });
      toast.success(res.data.message);
      refreshBalance();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Renewal failed');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find((p) => p.name === sub?.plan_name);
  const isExpired = sub && new Date(sub.expires_at) < new Date();

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">My VPN</h1>

      {!sub ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">You don't have an active VPN plan.</p>
          <Link to="/vpn" className="btn-primary inline-block">Browse VPN Plans</Link>
        </div>
      ) : (
        <div className="card max-w-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-display font-bold text-xl">{sub.plan_name} Plan</h3>
              <p className="text-xs text-gray-400">Config: {sub.config_key}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>Started: {new Date(sub.started_at).toLocaleDateString()}</p>
            <p>Expires: {new Date(sub.expires_at).toLocaleDateString()}</p>
          </div>
          <button onClick={() => renew(sub.plan_id)} disabled={loading} className="btn-primary w-full">
            {loading ? 'Processing...' : 'Renew Plan'}
          </button>
        </div>
      )}
    </div>
  );
}
