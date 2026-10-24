import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiGrid, FiCreditCard, FiWifi, FiShield, FiPackage, FiList, FiUser, FiGift, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Overview', icon: <FiGrid />, end: true },
  { to: '/dashboard/wallet', label: 'Wallet', icon: <FiCreditCard /> },
  { to: '/dashboard/buy-data', label: 'Buy Data/Airtime', icon: <FiWifi /> },
  { to: '/dashboard/vpn', label: 'My VPN', icon: <FiShield /> },
  { to: '/dashboard/orders', label: 'My Orders', icon: <FiPackage /> },
  { to: '/dashboard/transactions', label: 'Transactions', icon: <FiList /> },
  { to: '/dashboard/profile', label: 'Profile Settings', icon: <FiUser /> },
  { to: '/dashboard/referral', label: 'Refer & Earn', icon: <FiGift /> },
];

export default function DashboardLayout() {
  const { user, balance, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <p className="font-display font-bold text-lg">
          <span className="text-primary">Hi, {user?.name?.split(' ')[0]}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        <div className="mt-4 bg-dark text-white rounded-xl p-4">
          <p className="text-xs text-gray-300">Wallet Balance</p>
          <p className="font-display font-extrabold text-xl text-accent">₦{Number(balance).toLocaleString()}</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl w-full">
          <FiLogOut /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 bg-white border-r border-gray-100 fixed h-screen">{SidebarContent}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-dark/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-72 h-full">{SidebarContent}</div>
        </div>
      )}

      <div className="flex-1 lg:ml-72">
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-30">
          <span className="font-display font-bold">Dashboard</span>
          <button onClick={() => setOpen(true)}><FiMenu size={22} /></button>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
