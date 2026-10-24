import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-dark text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <img src="/logo.jpg" alt="Al-Zayn Hub" className="h-10 w-10 rounded-full object-cover" />
            <h3 className="font-display font-extrabold text-xl">
              <span className="text-white">Al-Zayn</span>
              <span className="text-primary"> Hub</span>
            </h3>
          </Link>
          <p className="text-sm text-gray-400">VTU Services · Gadgets</p>
          <div className="flex gap-4 mt-4 text-lg">
            <FaFacebook className="hover:text-primary cursor-pointer" />
            <FaInstagram className="hover:text-primary cursor-pointer" />
            <FaTwitter className="hover:text-primary cursor-pointer" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Services</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/vtu" className="hover:text-accent">Buy Data</Link></li>
            <li><Link to="/vpn" className="hover:text-accent">VPN Plans</Link></li>
            <li><Link to="/shop" className="hover:text-accent">Gadget Shop</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-accent">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact</Link></li>
            <li><Link to="/faq" className="hover:text-accent">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-accent">Login</Link></li>
            <li><Link to="/signup" className="hover:text-accent">Sign Up</Link></li>
            <li><Link to="/dashboard" className="hover:text-accent">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Al-Zayn Hub · All rights reserved.
      </div>
    </footer>
  );
}
