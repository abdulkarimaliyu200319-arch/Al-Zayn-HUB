import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiGrid, FiUsers, FiBox, FiWifi, FiPackage, FiList, FiSettings, FiLogOut, FiMenu } from 'react-icons/fi';

const links = [
  { to: '/admin', label: 'Overview', icon: <FiGrid />, end: true },
  { to: '/admin/users', label: 'Manage Users', icon: <FiUsers /> },
  { to: '/admin/products', label: 'Manage Products', icon: <FiBox /> },
  { to: '/admin/vtu', label: 'Manage VTU Prices', icon: <FiWifi /> },
  { to: '/admin/orders', label: 'Manage Orders', icon: <FiPackage /> },
  { to: '/admin/transactions', label: 'Transactions', icon: <FiList /> },
  { to: '/admin/settings', label: 'Site Settings', icon: <FiSettings /> },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('alzayn_admin_token');
    navigate('/admin/login');
  };

  const Sidebar = (
    <div className="flex flex-col h-full bg-dark text-white">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Al-Zayn Hub" className="h-8 w-8 rounded-full object-cover" />
          <p className="font-display font-bold text-lg">
            <span className="text-white">Al-Zayn</span><span className="text-primary"> Hub</span>
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}>
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl w-full">
          <FiLogOut /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:block w-64 fixed h-screen">{Sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-64 h-full">{Sidebar}</div>
        </div>
      )}
      <div className="flex-1 lg:ml-64">
        <div className="lg:hidden flex items-center justify-between p-4 bg-dark text-white sticky top-0 z-30">
          <span className="font-display font-bold">Admin Panel</span>
          <button onClick={() => setOpen(true)}><FiMenu size={22} /></button>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
