import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_COLOR = { Pending: 'bg-yellow-50 text-yellow-600', Processing: 'bg-blue-50 text-primary', Delivered: 'bg-green-50 text-green-600', Cancelled: 'bg-red-50 text-red-600' };

export default function MyOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/shop/my-orders').then((res) => setOrders(res.data.orders)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">Order #{o.id}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[o.status] || ''}`}>{o.status}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mb-3">
              {o.items.map((it, i) => (
                <p key={i}>{it.name} × {it.qty} — ₦{(it.price * it.qty).toLocaleString()}</p>
              ))}
            </div>
            <div className="flex justify-between font-bold border-t pt-3">
              <span>Total</span>
              <span>₦{o.total.toLocaleString()}</span>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-400 text-center py-10">You haven't placed any orders yet.</p>}
      </div>
    </div>
  );
}
