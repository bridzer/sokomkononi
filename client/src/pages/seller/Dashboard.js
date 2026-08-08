import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatKsh } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import SellerAvatar from '../../components/SellerAvatar';
import { formatAddressShort } from '../../utils/address';

export default function SellerDashboard() {
  const { seller } = useAuth();
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/seller/me'),
      api.get('/market/seller-insights').catch(() => ({ data: null })),
    ])
      .then(([me, ins]) => {
        setStats(me.data.stats);
        setInsights(ins.data);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Active listings', value: stats?.active_count ?? '—', hint: 'Live on shop' },
    { label: 'All listings', value: stats?.product_count ?? '—', hint: 'Including hidden' },
    { label: 'Orders', value: stats?.order_count ?? '—', hint: 'With your items' },
    {
      label: 'Your GMV',
      value: stats?.gmv != null ? formatKsh(stats.gmv) : '—',
      hint: 'Gross sales',
    },
    {
      label: 'Commission',
      value: stats?.commission_total != null ? formatKsh(stats.commission_total) : '—',
      hint: 'Platform fee',
    },
    { label: 'Stock units', value: stats?.total_stock ?? '—', hint: 'Across listings' },
  ];

  const place = formatAddressShort(seller) || seller?.location || '';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white shadow-lg shadow-brand-900/20">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(251,191,36,0.25), transparent 35%)',
          }}
        />
        <div className="relative p-5 sm:p-7 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <SellerAvatar seller={seller} size="xl" className="ring-4 ring-white/20" />
            <div className="min-w-0">
              <p className="text-brand-100 text-xs font-semibold uppercase tracking-wider">
                Seller hub
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {seller?.name || 'Your shop'}
              </h1>
              <p className="text-sm text-brand-100/90 mt-1 max-w-md">
                List farm goods, share product links, and fulfil orders from one place.
              </p>
              {place ? (
                <p className="text-xs text-brand-200 mt-2 truncate">{place}</p>
              ) : (
                <Link
                  to="/seller/profile"
                  className="inline-block text-xs text-amber-200 underline mt-2 hover:text-white"
                >
                  Add your base location on Profile
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/seller/listings"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-brand-900 font-semibold text-sm shadow-sm hover:bg-brand-50"
            >
              + New listing
            </Link>
            <Link
              to="/seller/profile"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-white/30 text-white text-sm font-medium hover:bg-white/10"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading your stats…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {c.label}
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-bold text-brand-900 tabular-nums">
                {c.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{c.hint}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Expansion opportunities</h2>
          {insights?.expansion_score?.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              {insights.expansion_score.map((row) => (
                <li key={row.county} className="flex justify-between gap-2">
                  <span>{row.county}</span>
                  <span className="text-xs text-slate-500">
                    demand {row.demand} · you {row.your_supply}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600 mt-1.5">
              Not enough demand data yet. Keep listing — signals build from orders and searches.
            </p>
          )}
          <Link to="/seller/payouts" className="btn-outline mt-4 text-sm">
            View payouts
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Season & waitlist</h2>
          {insights?.seasons?.active?.[0] && (
            <p className="text-sm text-slate-700 mt-1.5">
              Now: <strong>{insights.seasons.active[0].label}</strong> —{' '}
              {insights.seasons.active[0].note}
            </p>
          )}
          {insights?.booking_alerts?.length ? (
            <ul className="mt-2 text-sm text-slate-600 space-y-1">
              {insights.booking_alerts.slice(0, 3).map((b) => (
                <li key={b.id}>
                  Waitlist: {b.quantity}× {b.product_name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600 mt-1.5">No pending waitlist bookings.</p>
          )}
        </div>
      </div>
    </div>
  );
}
