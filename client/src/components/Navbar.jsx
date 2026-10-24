import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi';
import { FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/vtu', label: 'Buy Data' },
  { to: '/vpn', label: 'VPN' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, balance, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-dark text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-xl">
          <img src="/logo.jpg" alt="Al-Zayn Hub" className="h-9 w-9 rounded-full object-cover" />
          <span className="hidden sm:inline">
            <span className="text-white">Al-Zayn</span>
            <span className="text-primary"> Hub</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-accent transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <div className="text-sm text-right mr-1">
                <p className="font-semibold">Hi, {user.name?.split(' ')[0]}</p>
                <p className="text-accent text-xs font-bold">₦{Number(balance).toLocaleString()}</p>
              </div>
              <Link to="/dashboard" className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
                <FiUser /> Dashboard
              </Link>
              <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white flex items-center gap-1">
                <FiLogOut /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold hover:text-accent">Login</Link>
              <Link to="/signup" className="btn-accent !py-2 !px-4 text-sm">Sign Up</Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-2xl" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <HiX /> : <HiMenu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-dark border-t border-white/10 px-4 pb-4 space-y-3">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium border-b border-white/5">
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Hi, {user.name?.split(' ')[0]}</span>
                <span className="text-accent font-bold">₦{Number(balance).toLocaleString()}</span>
              </div>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-primary w-full text-center block !py-2.5 text-sm">Dashboard</Link>
              <button onClick={handleLogout} className="w-full text-left text-sm text-gray-300 py-2">Logout</button>
            </div>
          ) : (
            <div className="pt-2 flex gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-outline !border-white !text-white flex-1 text-center !py-2.5 text-sm">Login</Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="btn-accent flex-1 text-center !py-2.5 text-sm">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
