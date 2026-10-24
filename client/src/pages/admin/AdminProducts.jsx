import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/axios';

const emptyForm = { name: '', description: '', price: '', image: '', category: '', stock: 100 };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => api.get('/admin/products').then((res) => setProducts(res.data.products)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (p) => { setForm(p); setEditingId(p.id); setModalOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/products/${editingId}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', form);
        toast.success('Product added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display font-bold text-2xl">Manage Products</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><FiPlus /> Add Product</button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((p) => (
          <div key={p.id} className="card">
            <div className="h-24 bg-gray-100 rounded-xl mb-3 flex items-center justify-center text-2xl">📦</div>
            <h3 className="font-semibold text-sm mb-1">{p.name}</h3>
            <p className="text-primary font-bold mb-2">₦{p.price.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mb-3">Stock: {p.stock}</p>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="btn-outline !py-1.5 flex-1 text-xs flex items-center justify-center gap-1"><FiEdit2 size={12} /> Edit</button>
              <button onClick={() => remove(p.id)} className="text-red-500 border border-red-200 rounded-xl px-3 text-xs"><FiTrash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-2">{editingId ? 'Edit Product' : 'Add Product'}</h3>
            <input required className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea className="input-field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input required type="number" className="input-field" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className="input-field" placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input type="number" className="input-field" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
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
