import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <div className="text-6xl font-extrabold text-brand-700">404</div>
      <h1 className="text-2xl font-bold mt-2">Page not found</h1>
      <p className="text-slate-500 mt-2">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6 inline-block">
        Back to home
      </Link>
    </div>
  );
}
