import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);

  const handleChange = (key, value) => setSettings({ ...settings, [key]: value });

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Site Settings</h1>
      <form onSubmit={save} className="card max-w-xl space-y-4">
        <div>
          <label className="label">Site Name</label>
          <input className="input-field" value={settings.site_name || ''} onChange={(e) => handleChange('site_name', e.target.value)} />
        </div>
        <div>
          <label className="label">WhatsApp Number (with country code, no +)</label>
          <input className="input-field" value={settings.whatsapp_number || ''} onChange={(e) => handleChange('whatsapp_number', e.target.value)} placeholder="2348012345678" />
        </div>
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-gray-600">
          Online payments are handled by <b>Monnify</b>. Keys are set in <code>server/.env</code> (MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE, MONNIFY_ENV) and need a server restart.
        </div>
        <div>
          <label className="label">Referral Bonus (₦)</label>
          <input type="number" className="input-field" value={settings.referral_bonus || ''} onChange={(e) => handleChange('referral_bonus', e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save Settings'}</button>
      </form>
    </div>
  );
}
