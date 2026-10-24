import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('alzayn_admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}
