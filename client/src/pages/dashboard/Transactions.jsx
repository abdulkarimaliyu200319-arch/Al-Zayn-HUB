import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Transactions() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    api.get('/wallet/transactions').then((res) => setTxs(res.data.transactions)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Transaction History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Channel</th><th className="pb-2">Status</th><th className="pb-2">Description</th><th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2 capitalize">{t.type}</td>
                <td className="py-2">₦{t.amount.toLocaleString()}</td>
                <td className="py-2 capitalize">{t.channel}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'success' ? 'bg-green-50 text-green-600' : t.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-2 text-gray-500">{t.description}</td>
                <td className="py-2 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
