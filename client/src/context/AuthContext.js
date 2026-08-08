import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

function persistAuth(user, seller) {
  localStorage.setItem('kalro_user', JSON.stringify(user));
  if (seller) localStorage.setItem('kalro_seller', JSON.stringify(seller));
  else localStorage.removeItem('kalro_seller');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('kalro_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [seller, setSeller] = useState(() => {
    try {
      const raw = localStorage.getItem('kalro_seller');
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
      persistAuth(data.user, data.seller || null);
      setUser(data.user);
      setSeller(data.seller || null);
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
      persistAuth(data.user, data.seller || null);
      setUser(data.user);
      setSeller(data.seller || null);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kalro_token');
    localStorage.removeItem('kalro_user');
    localStorage.removeItem('kalro_seller');
    setUser(null);
    setSeller(null);
  }, []);

  const refreshSeller = useCallback(async () => {
    const { data } = await api.get('/seller/me');
    setSeller(data.seller);
    localStorage.setItem('kalro_seller', JSON.stringify(data.seller));
    return data;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('kalro_token');
    if (token && !user) {
      api
        .get('/auth/me')
        .then((r) => {
          setUser(r.data.user);
          setSeller(r.data.seller || null);
          persistAuth(r.data.user, r.data.seller || null);
        })
        .catch(() => logout());
    }
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        seller,
        isAdmin: user?.role === 'admin',
        isSeller: user?.role === 'seller',
        loading,
        login,
        register,
        logout,
        refreshSeller,
        setSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
