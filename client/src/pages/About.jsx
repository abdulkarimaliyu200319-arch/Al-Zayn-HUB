import React from 'react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-display font-bold text-3xl mb-4">About Al-Zayn Hub</h1>
      <p className="text-gray-600 mb-4">
        Al-Zayn Hub is a Nigerian technology platform delivering fast, secure and affordable
        digital services — from data and airtime top-ups to VPN subscriptions and gadget sales — all through a
        single wallet-powered platform.
      </p>
      <p className="text-gray-600 mb-4">
        Since inception, our mission has been simple: make digital transactions instant and trustworthy for every
        Nigerian, whether you're a student topping up data or a business owner managing bulk purchases.
      </p>
      <div className="grid sm:grid-cols-3 gap-6 mt-10">
        <div className="card text-center">
          <h3 className="font-display font-bold text-2xl text-primary">50K+</h3>
          <p className="text-sm text-gray-500 mt-1">Happy Customers</p>
        </div>
        <div className="card text-center">
          <h3 className="font-display font-bold text-2xl text-primary">99.9%</h3>
          <p className="text-sm text-gray-500 mt-1">Uptime</p>
        </div>
        <div className="card text-center">
          <h3 className="font-display font-bold text-2xl text-primary">24/7</h3>
          <p className="text-sm text-gray-500 mt-1">Customer Support</p>
        </div>
      </div>
    </div>
  );
}
