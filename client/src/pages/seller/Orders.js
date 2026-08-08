import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import { formatKsh, whatsappUrl, normalizeKenyanPhone } from '../../utils/format';
import AddressDisplay from '../../components/AddressDisplay';
import { formatAddressShort } from '../../utils/address';

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/seller/orders')
      .then((r) => setOrders(r.data.orders || []))
      .catch((err) => toast.error(formatApiError(err, 'Failed to load orders')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/seller/orders/${id}`);
      setDetail(data);
    } catch (err) {
      toast.error(formatApiError(err, 'Could not open order'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Orders that include your marketplace items (commission already calculated).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No orders yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => openDetail(o.id)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-800">{o.order_number}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {o.customer_name}
                      {formatAddressShort(o) ? ` · ${formatAddressShort(o)}` : ''} ·{' '}
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-brand-700">
                      {formatKsh(o.seller_subtotal)}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">{o.status}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">{detail.order.order_number}</h2>
                <p className="text-sm text-slate-500 capitalize">{detail.order.status}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
            <div className="text-sm space-y-1 mb-4">
              <div>
                <span className="text-slate-500">Customer:</span>{' '}
                {detail.order.customer_name}
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>{' '}
                {detail.order.customer_phone}
              </div>
              {detail.order.delivery_method && (
                <div>
                  <span className="text-slate-500">Delivery:</span>{' '}
                  {detail.order.delivery_method.replace(/_/g, ' ')}
                </div>
              )}
              {(detail.order.address_line1 || detail.order.delivery_address || detail.order.county) && (
                <div className="pt-2">
                  <div className="text-slate-500 mb-0.5">Address</div>
                  <AddressDisplay address={detail.order} />
                </div>
              )}
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Subtotal</th>
                    <th className="p-2 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((it) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="p-2">{it.product_name}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">{formatKsh(it.subtotal)}</td>
                      <td className="p-2 text-right text-slate-600">
                        {Number(it.commission_amount) > 0
                          ? formatKsh(it.commission_amount)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const to = normalizeKenyanPhone(detail.order.customer_phone);
              return to ? (
                <a
                  href={whatsappUrl(
                    `Hello ${detail.order.customer_name}, regarding Soko Mkononi order ${detail.order.order_number}.`,
                    to
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp w-full justify-center"
                >
                  WhatsApp customer
                </a>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
