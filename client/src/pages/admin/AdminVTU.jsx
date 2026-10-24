import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../../api/axios';

const emptyForm = { network: 'MTN', plan_type: 'SME', size: '', validity: '30 Days', price: '' };

export default function AdminVTU() {
  const [prices, setPrices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => api.get('/admin/vtu-prices').then((res) => setPrices(res.data.prices)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/vtu-prices', form);
      toast.success('Price added');
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this price?')) return;
    try {
      await api.delete(`/admin/vtu-prices/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display font-bold text-2xl">Manage VTU Data Prices</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm"><FiPlus /> Add Price</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Network</th><th className="pb-2">Plan Type</th><th className="pb-2">Size</th><th className="pb-2">Validity</th><th className="pb-2">Price</th><th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.network}</td>
                <td className="py-2">{p.plan_type}</td>
                <td className="py-2">{p.size}</td>
                <td className="py-2">{p.validity}</td>
                <td className="py-2">₦{p.price.toLocaleString()}</td>
                <td className="py-2"><button onClick={() => remove(p.id)} className="text-red-500"><FiTrash2 size={14} /></button></td>
              </tr>
            ))}
            {prices.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No prices yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold mb-2">Add VTU Price</h3>
            <select className="input-field" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
              {['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map((n) => <option key={n}>{n}</option>)}
            </select>
            <input required className="input-field" placeholder="Plan Type (e.g SME)" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} />
            <input required className="input-field" placeholder="Size (e.g 1GB)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <input required className="input-field" placeholder="Validity (e.g 30 Days)" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
            <input required type="number" className="input-field" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
