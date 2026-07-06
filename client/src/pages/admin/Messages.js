import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { whatsappUrl } from '../../utils/format';

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
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Messages</h1>
      <div className="space-y-3">
        {loading && <div className="text-slate-500">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="card p-6 text-slate-500 text-center">No messages yet.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`card p-5 ${!m.is_read ? 'border-l-4 border-brand-500' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500">
                  {m.phone && <span>{m.phone} · </span>}
                  {m.email && <span>{m.email} · </span>}
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.phone && (
                  <a
                    href={whatsappUrl(`Hello ${m.name}, this is Kalro Farm replying to your enquiry.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp text-xs py-1 px-3"
                  >
                    WhatsApp
                  </a>
                )}
                {!m.is_read && (
                  <button className="btn-ghost text-xs py-1" onClick={() => markRead(m.id)}>
                    Mark read
                  </button>
                )}
                <button className="text-red-600 text-xs hover:underline" onClick={() => remove(m.id)}>
                  Delete
                </button>
              </div>
            </div>
            {m.subject && <div className="mt-2 font-medium">{m.subject}</div>}
            <div className="mt-1 text-slate-700 whitespace-pre-line">{m.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
