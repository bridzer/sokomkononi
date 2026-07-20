import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { BUSINESS, PHONE_NUMBERS, WHATSAPP_NUMBERS, whatsappUrl } from '../utils/format';
import { trackGenerateLead } from '../utils/analytics';

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error('Name and message are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      trackGenerateLead('contact_form');
      toast.success('Message sent — we will get back to you shortly.');
      setForm({ name: '', phone: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="bg-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold">Contact us</h1>
          <p className="mt-2 text-brand-100">We reply fastest on WhatsApp.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Reach us directly</h2>
          <div className="mt-4 space-y-3">
            {PHONE_NUMBERS.map((p) => (
              <a
                key={p.id}
                href={`tel:${p.intl}`}
                className="card p-4 flex items-center gap-3 hover:bg-slate-50"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">Phone · {p.label}</div>
                  <div className="font-semibold text-slate-800">{p.display}</div>
                  {p.subtitle && (
                    <div className="text-xs text-slate-500">{p.subtitle}</div>
                  )}
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
            {WHATSAPP_NUMBERS.map((n) => (
              <a
                key={n.id}
                href={whatsappUrl(`Hello ${BUSINESS.name}, I'd like to talk.`, n.number)}
                target="_blank"
                rel="noreferrer"
                className="card p-4 flex items-center gap-3 hover:bg-slate-50"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366] text-white grid place-items-center font-bold">W</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">WhatsApp · {n.label}</div>
                  <div className="font-semibold text-slate-800">{n.display}</div>
                  {n.subtitle && (
                    <div className="text-xs text-slate-500">{n.subtitle}</div>
                  )}
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold">E</div>
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-slate-800">
                  {BUSINESS.email}
                </a>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold">L</div>
              <div>
                <div className="text-xs text-slate-500">Location</div>
                <div className="font-semibold text-slate-800">{BUSINESS.location}</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Send a message</h2>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              value={form.subject}
              onChange={(e) => setField('subject', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea
              className="input"
              rows={5}
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  );
}
