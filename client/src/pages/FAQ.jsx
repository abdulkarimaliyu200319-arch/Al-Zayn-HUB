import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const faqs = [
  { q: 'How do I fund my wallet?', a: 'Go to Dashboard > Wallet and click "Fund Wallet". You can pay instantly via Monnify using card, bank transfer or USSD.' },
  { q: 'How fast is data delivery?', a: 'Data and airtime purchases are delivered instantly once your wallet has sufficient balance.' },
  { q: 'Can I get a refund for a failed transaction?', a: 'Yes — failed VTU transactions are automatically reversed to your wallet within minutes. Contact support if it takes longer.' },
  { q: 'How does the referral program work?', a: 'Share your unique referral link. When someone signs up using it, you earn ₦500 credited straight to your wallet.' },
  { q: 'Is my payment information secure?', a: 'Yes, all payments are processed securely through Monnify — we never store your card details.' },
  { q: 'How do I track my gadget order?', a: 'Visit Dashboard > My Orders to see real-time status: Pending, Processing, or Delivered.' },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display font-bold text-3xl mb-8 text-center">Frequently Asked Questions</h1>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="card cursor-pointer" onClick={() => setOpen(open === i ? null : i)}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{f.q}</h3>
              <FiChevronDown className={`transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </div>
            {open === i && <p className="text-sm text-gray-600 mt-3">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
