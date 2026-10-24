import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Data', 'Airtime', 'Cable', 'Electricity'];
const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
const CABLE_PROVIDERS = ['DSTV', 'GOTV', 'STARTIMES'];
const DISCOS = ['EKEDC', 'IKEDC', 'AEDC', 'PHEDC', 'KEDCO', 'IBEDC', 'EEDC', 'JED', 'KAEDCO', 'BEDC', 'YEDC'];

const STATUS_STYLE = {
  success: 'bg-green-50 text-green-600',
  pending: 'bg-yellow-50 text-yellow-600',
  failed: 'bg-red-50 text-red-600',
};

export default function BuyData() {
  const [tab, setTab] = useState('Data');
  const [network, setNetwork] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const [cableProvider, setCableProvider] = useState('DSTV');
  const [cablePlans, setCablePlans] = useState([]);
  const [cablePlan, setCablePlan] = useState('');
  const [smartcard, setSmartcard] = useState('');
  const [cableCustomer, setCableCustomer] = useState(null);

  const [disco, setDisco] = useState('EKEDC');
  const [meterType, setMeterType] = useState('Prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterCustomer, setMeterCustomer] = useState(null);
  const [lastToken, setLastToken] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const { refreshBalance } = useAuth();

  const loadHistory = () => api.get('/data/history').then((res) => setHistory(res.data.history)).catch(() => {});

  useEffect(() => {
    api.get('/data/data-plans').then((res) => setPlans(res.data.plans)).catch(() => {});
    loadHistory();
  }, []);

  // Cable plans are fetched live so prices are always correct
  useEffect(() => {
    setCablePlans([]);
    setCablePlan('');
    setCableCustomer(null);
    api.get(`/data/cable-plans/${cableProvider}`).then((res) => setCablePlans(res.data.plans)).catch(() => {});
  }, [cableProvider]);

  const networkPlans = plans.filter((p) => p.network === network);

  // Shows the right toast for success / still-processing, and refreshes balance + history
  const handleResult = (res) => {
    if (res.data.pending) toast(res.data.message, { icon: '⏳', duration: 7000 });
    else toast.success(res.data.message);
    refreshBalance();
    loadHistory();
  };

  const handleError = (err) => {
    toast.error(err.response?.data?.message || 'Purchase failed');
    if (err.response?.data?.balance !== undefined) refreshBalance(); // e.g. after an automatic refund
    loadHistory();
  };

  const submitData = async () => {
    if (!selectedPlan || !phone) return toast.error('Select a plan and enter phone number');
    setLoading(true);
    try {
      const res = await api.post('/data/buy-data', { network, phone, planId: selectedPlan });
      handleResult(res);
      setPhone('');
      setSelectedPlan(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAirtime = async () => {
    if (!phone || !amount) return toast.error('Enter phone number and amount');
    setLoading(true);
    try {
      const res = await api.post('/data/buy-airtime', { network, phone, amount: Number(amount) });
      handleResult(res);
      setPhone('');
      setAmount('');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const verifySmartcard = async () => {
    if (!smartcard) return toast.error('Enter smartcard number first');
    setVerifying(true);
    setCableCustomer(null);
    try {
      const res = await api.post('/data/verify-smartcard', { provider: cableProvider, smartcard });
      setCableCustomer(res.data.customer);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify smartcard');
    } finally {
      setVerifying(false);
    }
  };

  const submitCable = async () => {
    if (!smartcard || !cablePlan) return toast.error('Enter smartcard number and select a plan');
    setLoading(true);
    try {
      const res = await api.post('/data/buy-cable', { provider: cableProvider, smartcard, planCode: cablePlan });
      handleResult(res);
      setSmartcard('');
      setCablePlan('');
      setCableCustomer(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyMeter = async () => {
    if (!meterNumber) return toast.error('Enter meter number first');
    setVerifying(true);
    setMeterCustomer(null);
    try {
      const res = await api.post('/data/verify-meter', { disco, meterNumber, meterType });
      setMeterCustomer(res.data.customer);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify meter');
    } finally {
      setVerifying(false);
    }
  };

  const submitElectricity = async () => {
    if (!meterNumber || !amount) return toast.error('Enter meter number and amount');
    setLoading(true);
    setLastToken(null);
    try {
      const res = await api.post('/data/buy-electricity', { disco, meterNumber, meterType, amount: Number(amount) });
      handleResult(res);
      if (res.data.token) setLastToken(res.data.token);
      setMeterNumber('');
      setAmount('');
      setMeterCustomer(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard?.writeText(lastToken).then(() => toast.success('Token copied'));
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Buy Data, Airtime, Cable & Electricity</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === t ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="card max-w-xl">
        {tab === 'Data' && (
          <div className="space-y-4">
            <div>
              <label className="label">Network</label>
              <select className="input-field" value={network} onChange={(e) => { setNetwork(e.target.value); setSelectedPlan(null); }}>
                {NETWORKS.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080XXXXXXXX" inputMode="numeric" />
            </div>
            <div>
              <label className="label">Select Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {networkPlans.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`border rounded-xl p-3 text-left text-sm ${selectedPlan === p.id ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                    <p className="font-semibold">{p.size}</p>
                    <p className="text-xs text-gray-400">{p.validity}</p>
                    <p className="text-primary font-bold text-sm">₦{p.price.toLocaleString()}</p>
                  </button>
                ))}
                {networkPlans.length === 0 && <p className="text-sm text-gray-400 col-span-2">No plans available for {network} right now.</p>}
              </div>
            </div>
            <button onClick={submitData} disabled={loading} className="btn-primary w-full">{loading ? 'Processing...' : 'Buy Data'}</button>
          </div>
        )}

        {tab === 'Airtime' && (
          <div className="space-y-4">
            <div>
              <label className="label">Network</label>
              <select className="input-field" value={network} onChange={(e) => setNetwork(e.target.value)}>
                {NETWORKS.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080XXXXXXXX" inputMode="numeric" />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min ₦50" />
            </div>
            <button onClick={submitAirtime} disabled={loading} className="btn-primary w-full">{loading ? 'Processing...' : 'Buy Airtime'}</button>
          </div>
        )}

        {tab === 'Cable' && (
          <div className="space-y-4">
            <div>
              <label className="label">Provider</label>
              <select className="input-field" value={cableProvider} onChange={(e) => setCableProvider(e.target.value)}>
                {CABLE_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Smartcard Number</label>
              <div className="flex gap-2">
                <input className="input-field" value={smartcard} onChange={(e) => { setSmartcard(e.target.value); setCableCustomer(null); }} placeholder="Enter smartcard/IUC number" inputMode="numeric" />
                <button type="button" onClick={verifySmartcard} disabled={verifying} className="px-4 rounded-xl border border-primary text-primary text-sm font-medium whitespace-nowrap">
                  {verifying ? '...' : 'Verify'}
                </button>
              </div>
              {cableCustomer && (
                <p className="text-sm text-green-600 mt-2">✓ {cableCustomer.name}{cableCustomer.bouquet ? ` — ${cableCustomer.bouquet}` : ''}</p>
              )}
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input-field" value={cablePlan} onChange={(e) => setCablePlan(e.target.value)}>
                <option value="">{cablePlans.length ? 'Select a plan' : 'Loading plans...'}</option>
                {cablePlans.map((p) => <option key={p.code} value={p.code}>{p.name} - ₦{p.price.toLocaleString()}</option>)}
              </select>
            </div>
            <button onClick={submitCable} disabled={loading} className="btn-primary w-full">{loading ? 'Processing...' : 'Subscribe'}</button>
          </div>
        )}

        {tab === 'Electricity' && (
          <div className="space-y-4">
            <div>
              <label className="label">Disco</label>
              <select className="input-field" value={disco} onChange={(e) => { setDisco(e.target.value); setMeterCustomer(null); }}>
                {DISCOS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Meter Type</label>
              <select className="input-field" value={meterType} onChange={(e) => { setMeterType(e.target.value); setMeterCustomer(null); }}>
                <option>Prepaid</option>
                <option>Postpaid</option>
              </select>
            </div>
            <div>
              <label className="label">Meter Number</label>
              <div className="flex gap-2">
                <input className="input-field" value={meterNumber} onChange={(e) => { setMeterNumber(e.target.value); setMeterCustomer(null); }} inputMode="numeric" />
                <button type="button" onClick={verifyMeter} disabled={verifying} className="px-4 rounded-xl border border-primary text-primary text-sm font-medium whitespace-nowrap">
                  {verifying ? '...' : 'Verify'}
                </button>
              </div>
              {meterCustomer && (
                <p className="text-sm text-green-600 mt-2">✓ {meterCustomer.name}{meterCustomer.address ? ` — ${meterCustomer.address}` : ''}</p>
              )}
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min ₦500" />
            </div>
            <button onClick={submitElectricity} disabled={loading} className="btn-primary w-full">{loading ? 'Processing...' : 'Pay Bill'}</button>

            {lastToken && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Your electricity token</p>
                <p className="font-mono font-bold text-lg break-all">{lastToken}</p>
                <button type="button" onClick={copyToken} className="text-sm text-primary font-medium mt-2">Copy token</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card mt-8">
        <h3 className="font-semibold mb-4">Recent VTU History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-2">Type</th><th className="pb-2">Network</th><th className="pb-2">Detail</th><th className="pb-2">Amount</th><th className="pb-2">Status</th><th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="py-2 capitalize">{h.type}</td>
                  <td className="py-2">{h.network}</td>
                  <td className="py-2">
                    {h.plan}
                    {h.token && <div className="text-xs text-primary font-mono break-all">Token: {h.token}</div>}
                  </td>
                  <td className="py-2">₦{h.amount.toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[h.status] || STATUS_STYLE.failed}`}>{h.status}</span>
                  </td>
                  <td className="py-2 text-gray-400">{new Date(h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No history yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
