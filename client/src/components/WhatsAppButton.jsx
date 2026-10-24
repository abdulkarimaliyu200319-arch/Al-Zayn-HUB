import React, { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import api from '../api/axios';

export default function WhatsAppButton() {
  const [number, setNumber] = useState('2347019809623');

  useEffect(() => {
    api.get('/public/settings').then((res) => {
      if (res.data.settings?.whatsapp_number) setNumber(res.data.settings.whatsapp_number);
    }).catch(() => {});
  }, []);

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp size={28} />
    </a>
  );
}
