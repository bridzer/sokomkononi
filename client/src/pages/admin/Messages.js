import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { whatsappUrl, normalizeKenyanPhone } from '../../utils/format';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/messages')
      .then((r) => setMessages(r.data.messages || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/admin/messages/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">Messages</h1>
      <div className="space-y-3">
        {loading && <div className="text-slate-500 text-center py-8">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="card p-6 text-slate-500 text-center">No messages yet.</div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`card p-4 sm:p-5 ${!m.is_read ? 'border-l-4 border-brand-500' : ''}`}
          >
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500 mt-1 break-words">
                  {m.phone && <span>{m.phone}</span>}
                  {m.phone && m.email && <span> · </span>}
                  {m.email && <span>{m.email}</span>}
                  {(m.phone || m.email) && <span> · </span>}
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {(() => {
                  const to = normalizeKenyanPhone(m.phone);
                  return to ? (
                    <a
                      href={whatsappUrl(
                        `Hello ${m.name}, this is Kalro Farm replying to your enquiry.`,
                        to
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-whatsapp text-sm py-2 px-4 w-full sm:w-auto justify-center"
                    >
                      WhatsApp
                    </a>
                  ) : null;
                })()}
                {!m.is_read && (
                  <button
                    type="button"
                    className="btn-outline text-sm py-2 px-4 w-full sm:w-auto"
                    onClick={() => markRead(m.id)}
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost text-sm py-2 px-4 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                  onClick={() => remove(m.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            {m.subject && <div className="mt-3 font-medium text-slate-800">{m.subject}</div>}
            <div className="mt-2 text-sm sm:text-base text-slate-700 whitespace-pre-line break-words">
              {m.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
