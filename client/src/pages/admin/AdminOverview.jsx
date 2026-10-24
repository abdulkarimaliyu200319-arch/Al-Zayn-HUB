import React, { useEffect, useState } from 'react';
import { FiUsers, FiPackage, FiDollarSign, FiCreditCard, FiClock } from 'react-icons/fi';
import api from '../../api/axios';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data.stats)).catch(() => {});
  }, []);

  const cards = stats && [
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers /> },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiPackage /> },
    { label: 'Total Revenue', value: `₦${Number(stats.totalRevenue).toLocaleString()}`, icon: <FiDollarSign /> },
    { label: 'Total Wallet Balances', value: `₦${Number(stats.totalWalletBalance).toLocaleString()}`, icon: <FiCreditCard /> },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: <FiClock /> },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Admin Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards?.map((c) => (
          <div key={c.label} className="card">
            <div className="text-primary text-xl mb-2">{c.icon}</div>
            <p className="text-2xl font-display font-extrabold">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
