import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [fundModal, setFundModal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  const load = () => api.get('/admin/users').then((res) => setUsers(res.data.users)).catch(() => {});

  useEffect(() => { load(); }, []);

  const toggleBan = async (user) => {
    try {
      await api.patch(`/admin/users/${user.id}/ban`, { banned: !user.is_banned });
      toast.success(user.is_banned ? 'User unbanned' : 'User banned');
      load();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const fundUser = async () => {
    if (!fundAmount || fundAmount <= 0) return toast.error('Enter a valid amount');
    try {
      await api.post(`/admin/users/${fundModal.id}/fund`, { amount: Number(fundAmount), description: 'Manual admin credit' });
      toast.success('Wallet funded');
      setFundModal(null);
      setFundAmount('');
      load();
    } catch (err) {
      toast.error('Funding failed');
    }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Manage Users</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Phone</th><th className="pb-2">Balance</th><th className="pb-2">Status</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2">{u.name}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.phone}</td>
                <td className="py-2">₦{Number(u.balance || 0).toLocaleString()}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_banned ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {u.is_banned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="py-2 space-x-2">
                  <button onClick={() => setFundModal(u)} className="text-primary text-xs font-semibold">Fund</button>
                  <button onClick={() => toggleBan(u)} className="text-red-500 text-xs font-semibold">{u.is_banned ? 'Unban' : 'Ban'}</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {fundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Fund {fundModal.name}'s Wallet</h3>
            <input type="number" className="input-field mb-4" placeholder="Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setFundModal(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={fundUser} className="btn-primary flex-1">Fund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
