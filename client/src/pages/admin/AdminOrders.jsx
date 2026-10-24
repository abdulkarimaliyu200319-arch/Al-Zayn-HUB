import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const STATUSES = ['Pending', 'Processing', 'Delivered', 'Cancelled'];
const STATUS_COLOR = { Pending: 'bg-yellow-50 text-yellow-600', Processing: 'bg-blue-50 text-primary', Delivered: 'bg-green-50 text-green-600', Cancelled: 'bg-red-50 text-red-600' };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const load = () => api.get('/admin/orders').then((res) => setOrders(res.data.orders)).catch(() => {});
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      toast.success(`Order marked as ${status}`);
      load();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Manage Orders</h1>
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
              <div>
                <p className="font-semibold">Order #{o.id} — {o.customer_name}</p>
                <p className="text-xs text-gray-400">{o.customer_email} · {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <select
                value={o.status}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 ${STATUS_COLOR[o.status]}`}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mb-2">
              {o.items.map((it, i) => <p key={i}>{it.name} × {it.qty} — ₦{(it.price * it.qty).toLocaleString()}</p>)}
            </div>
            <p className="text-xs text-gray-400 mb-2">Address: {o.address || 'N/A'}</p>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span>₦{o.total.toLocaleString()}</span>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-400 text-center py-10">No orders yet.</p>}
      </div>
    </div>
  );
}
