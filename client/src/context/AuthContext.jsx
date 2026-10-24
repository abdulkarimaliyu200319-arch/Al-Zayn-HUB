import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('alzayn_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshBalance = async () => {
    if (!localStorage.getItem('alzayn_token')) return;
    try {
      const res = await api.get('/wallet/balance');
      setBalance(res.data.balance);
    } catch (err) {
      /* silent */
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('alzayn_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('alzayn_user', JSON.stringify(res.data.user));
      await refreshBalance();
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('alzayn_token', token);
    localStorage.setItem('alzayn_user', JSON.stringify(userData));
    setUser(userData);
    refreshBalance();
  };

  const logout = () => {
    localStorage.removeItem('alzayn_token');
    localStorage.removeItem('alzayn_user');
    setUser(null);
    setBalance(0);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, balance, setBalance, refreshBalance, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
