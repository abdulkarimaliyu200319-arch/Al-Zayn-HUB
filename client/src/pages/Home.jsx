import React from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiShield, FiTruck, FiStar } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: <FiZap />, title: 'Instant Delivery', desc: 'Data, airtime and VPN activated in seconds, 24/7.' },
  { icon: <FiShield />, title: 'Secure Payments', desc: 'Secure card, bank transfer and USSD payments via Monnify on every transaction.' },
  { icon: <FiTruck />, title: 'Fast Gadget Delivery', desc: 'Order gadgets and track delivery right from your dashboard.' },
];

const testimonials = [
  { name: 'Chidinma A.', text: 'Fastest data purchase I have ever done. Wallet funding is instant!' },
  { name: 'Tunde O.', text: 'Their VPN plan is solid and support responds within minutes on WhatsApp.' },
  { name: 'Grace E.', text: 'Ordered a power bank and it arrived in 2 days. Tracking was so easy.' },
  { name: 'Ibrahim K.', text: 'I refer friends all the time — the ₦500 bonus adds up fast!' },
  { name: 'Blessing N.', text: 'Al-Zayn Hub is now my go-to for cable subscription and electricity bills.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="bg-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-dark to-accent/10" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 text-center">
          <span className="inline-block bg-white/10 text-accent text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide">
            AL-ZAYN HUB — TRUSTED BY THOUSANDS
          </span>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-tight max-w-3xl mx-auto">
            Al-Zayn Hub. Data. Gadgets. <span className="text-accent">Bills payment.</span>
          </h1>
          <p className="text-gray-300 mt-5 max-w-xl mx-auto text-base md:text-lg">
            Buy data, airtime, VPN plans, and premium gadgets — all in one fast, secure wallet-powered platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {!user ? (
              <>
                <Link to="/login" className="btn-outline !border-white !text-white">Login</Link>
                <Link to="/signup" className="btn-accent">Sign Up Free</Link>
              </>
            ) : null}
            <Link to="/vtu" className="btn-primary">Buy Data Now</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-xl mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-center mb-10">Everything you need, in one place</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Link to="/vtu" className="card hover:-translate-y-1 transition-transform">
              <h3 className="font-semibold text-lg mb-1">📶 Data & Airtime</h3>
              <p className="text-sm text-gray-500">MTN, GLO, AIRTEL, 9MOBILE — instant top-ups from your wallet.</p>
            </Link>
            <Link to="/vpn" className="card hover:-translate-y-1 transition-transform">
              <h3 className="font-semibold text-lg mb-1">🔒 VPN Plans</h3>
              <p className="text-sm text-gray-500">Browse securely with our Basic, Pro and Premium VPN plans.</p>
            </Link>
            <Link to="/shop" className="card hover:-translate-y-1 transition-transform">
              <h3 className="font-semibold text-lg mb-1">🛒 Gadget Shop</h3>
              <p className="text-sm text-gray-500">Chargers, earbuds, power banks and more — delivered fast.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="font-display font-bold text-2xl md:text-3xl text-center mb-10">What our customers say</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="card">
              <div className="flex text-accent mb-3">
                {[...Array(5)].map((_, j) => <FiStar key={j} fill="currentColor" />)}
              </div>
              <p className="text-sm text-gray-600 mb-4">"{t.text}"</p>
              <p className="font-semibold text-sm">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-3">Ready to get started?</h2>
          <p className="text-blue-100 mb-6">Create your free Al-Zayn Hub account and fund your wallet in under a minute.</p>
          <Link to="/signup" className="btn-accent inline-block">Create Free Account</Link>
        </div>
      </section>
    </div>
  );
}
