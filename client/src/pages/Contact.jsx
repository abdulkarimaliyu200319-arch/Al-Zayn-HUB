import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("Message received! We'll get back to you within 24 hours.");
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
      <div>
        <h1 className="font-display font-bold text-3xl mb-4">Get in Touch</h1>
        <p className="text-gray-600 mb-6">Have a question or need support? Reach out — we respond fast.</p>
        <div className="space-y-4 text-sm">
          <p className="flex items-center gap-3"><FiMail className="text-primary" /> support@alzaynhub.com</p>
          <p className="flex items-center gap-3"><FiPhone className="text-primary" /> +234 701 980 9623</p>
          <p className="flex items-center gap-3"><FiMapPin className="text-primary" /> Abuja, Nigeria</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Name</label>
          <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea required rows={4} className="input-field" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary w-full">Send Message</button>
      </form>
    </div>
  );
}
