import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('kalro_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('kalro_token', data.token);
      localStorage.setItem('kalro_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('kalro_token', data.token);
      localStorage.setItem('kalro_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kalro_token');
    localStorage.removeItem('kalro_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('kalro_token');
    if (token && !user) {
      api
        .get('/auth/me')
        .then((r) => {
          setUser(r.data.user);
          localStorage.setItem('kalro_user', JSON.stringify(r.data.user));
        })
        .catch(() => logout());
    }
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin: user?.role === 'admin', loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
