import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('bhc_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => sessionStorage.getItem('bhc_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      const storedToken = sessionStorage.getItem('bhc_token');
      const storedUser = sessionStorage.getItem('bhc_user');
      setToken(storedToken);
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener('bhc_auth_change', handleAuthChange);
    return () => window.removeEventListener('bhc_auth_change', handleAuthChange);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      sessionStorage.setItem('bhc_token', data.token);
      sessionStorage.setItem('bhc_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api('/api/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      console.warn('Logout request failed or session already expired:', e.message);
    } finally {
      sessionStorage.removeItem('bhc_token');
      sessionStorage.removeItem('bhc_user');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
