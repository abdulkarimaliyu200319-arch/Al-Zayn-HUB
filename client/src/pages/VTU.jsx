import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const NETWORK_COLORS = { MTN: 'bg-yellow-400 text-black', GLO: 'bg-green-600 text-white', AIRTEL: 'bg-red-600 text-white', '9MOBILE': 'bg-green-800 text-white' };

export default function VTU() {
  const [plans, setPlans] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/data/data-plans').then((res) => setPlans(res.data.plans)).catch(() => {});
  }, []);

  const grouped = plans.reduce((acc, p) => {
    acc[p.network] = acc[p.network] || [];
    acc[p.network].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="text-center mb-10">
        <h1 className="font-display font-bold text-3xl mb-2">Buy Data & Airtime Instantly</h1>
        <p className="text-gray-500">Cheapest data prices for MTN, GLO, AIRTEL & 9MOBILE. Login to purchase instantly from your wallet.</p>
        {!user && (
          <Link to="/login" className="btn-primary inline-block mt-5">Login to Buy Data</Link>
        )}
        {user && (
          <Link to="/dashboard/buy-data" className="btn-primary inline-block mt-5">Go to Buy Data Dashboard</Link>
        )}
      </div>

      {Object.entries(grouped).map(([network, items]) => (
        <div key={network} className="mb-10">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${NETWORK_COLORS[network] || 'bg-gray-200'}`}>{network}</span>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((p) => (
              <div key={p.id} className="card text-center">
                <p className="font-display font-bold text-xl">{p.size}</p>
                <p className="text-xs text-gray-400 mb-2">{p.validity} · {p.plan_type}</p>
                <p className="text-primary font-bold text-lg">₦{p.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
