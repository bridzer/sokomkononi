import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard.
 *  - adminOnly → /admin/login
 *  - sellerOnly → /seller/login
 *  - default (auth required) → /login
 */
export default function ProtectedRoute({
  children,
  adminOnly = false,
  sellerOnly = false,
}) {
  const { user, isAdmin, isSeller } = useAuth();
  const location = useLocation();

  if (!user) {
    const to = adminOnly
      ? '/admin/login'
      : sellerOnly
      ? '/seller/login'
      : '/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (sellerOnly && !isSeller) {
    return <Navigate to="/seller/login" replace />;
  }

  return children;
}
