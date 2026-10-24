import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiWifi, FiShield, FiPackage, FiPlusCircle } from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Overview() {
  const { user, balance } = useAuth();
  const [orders, setOrders] = useState([]);
  const [vtuHistory, setVtuHistory] = useState([]);

  useEffect(() => {
    api.get('/shop/my-orders').then((res) => setOrders(res.data.orders.slice(0, 3))).catch(() => {});
    api.get('/data/history').then((res) => setVtuHistory(res.data.history.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-dark text-white">
          <p className="text-xs text-gray-300 mb-1">Wallet Balance</p>
          <p className="font-display font-extrabold text-2xl text-accent">₦{Number(balance).toLocaleString()}</p>
          <Link to="/dashboard/wallet" className="text-xs text-accent underline mt-2 inline-block">Fund Wallet</Link>
        </div>
        <Link to="/dashboard/buy-data" className="card hover:shadow-glow transition-shadow">
          <FiWifi className="text-primary text-2xl mb-2" />
          <p className="font-semibold text-sm">Buy Data / Airtime</p>
        </Link>
        <Link to="/dashboard/vpn" className="card hover:shadow-glow transition-shadow">
          <FiShield className="text-primary text-2xl mb-2" />
          <p className="font-semibold text-sm">Manage VPN</p>
        </Link>
        <Link to="/dashboard/orders" className="card hover:shadow-glow transition-shadow">
          <FiPackage className="text-primary text-2xl mb-2" />
          <p className="font-semibold text-sm">Track Orders</p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Recent Orders</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="flex justify-between text-sm border-b pb-2">
                  <span>Order #{o.id}</span>
                  <span className="font-medium">₦{o.total.toLocaleString()}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-primary">{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Recent VTU Transactions</h3>
          {vtuHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {vtuHistory.map((v) => (
                <div key={v.id} className="flex justify-between text-sm border-b pb-2">
                  <span>{v.network} {v.type}</span>
                  <span className="font-medium">₦{v.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
