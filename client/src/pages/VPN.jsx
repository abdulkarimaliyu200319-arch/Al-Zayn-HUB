import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCheck } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function VPN() {
  const [plans, setPlans] = useState([]);
  const [processing, setProcessing] = useState(null);
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/vpn/plans').then((res) => setPlans(res.data.plans)).catch(() => {});
  }, []);

  const buy = async (plan, method) => {
    if (!user) return navigate('/login');
    setProcessing(plan.id + method);
    try {
      if (method === 'wallet') {
        const res = await api.post('/vpn/subscribe/wallet', { planId: plan.id });
        toast.success(res.data.message);
        refreshBalance();
        navigate('/dashboard/vpn');
      } else {
        const res = await api.post('/vpn/subscribe/online/initialize', { planId: plan.id });
        window.location.href = res.data.authorization_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="font-display font-bold text-3xl mb-2">Choose Your VPN Plan</h1>
        <p className="text-gray-500">Fast, secure, no-logs VPN — pay with wallet or online (card / bank transfer).</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <div key={plan.id} className={`card flex flex-col ${i === 1 ? 'border-2 border-primary shadow-glow relative' : ''}`}>
            {i === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full font-semibold">MOST POPULAR</span>}
            <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
            <p className="text-3xl font-extrabold mb-1">₦{plan.price.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mb-5">{plan.duration_days} Days · {plan.devices} Device(s)</p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                  <FiCheck className="text-accent mt-0.5 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <button disabled={processing === plan.id + 'wallet'} onClick={() => buy(plan, 'wallet')} className="btn-primary w-full text-sm">
                {processing === plan.id + 'wallet' ? 'Processing...' : 'Pay with Wallet'}
              </button>
              <button disabled={processing === plan.id + 'online'} onClick={() => buy(plan, 'online')} className="btn-outline w-full text-sm">
                {processing === plan.id + 'online' ? 'Redirecting...' : 'Pay Online'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
