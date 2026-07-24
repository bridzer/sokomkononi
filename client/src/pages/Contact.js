import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import {
  BUSINESS,
  PHONE_NUMBERS,
  SOCIAL_LINKS,
  WHATSAPP_NUMBERS,
  whatsappUrl,
} from '../utils/format';
import { trackGenerateLead } from '../utils/analytics';

function SocialIcon({ id }) {
  const cls = 'w-5 h-5';
  switch (id) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M13.5 9.5V7.7c0-.8.6-1 1-1h1.5V4h-2.1C12.8 4 11 5.8 11 8.2V9.5H9v2.7h2v6.8h2.5v-6.8H16l-.5-2.7h-2z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm10 2H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zm-5 3.5A3.5 3.5 0 1112 16a3.5 3.5 0 010-7zm0 2A1.5 1.5 0 1013.5 12 1.5 1.5 0 0012 10.5zM17 7.75a.75.75 0 11-.75.75A.75.75 0 0117 7.75z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M17.3 4h3.2l-7 8.1L21.5 20h-6.1l-4.8-6.3-5.5 6.3H2.1l7.5-8.6L2.5 4h6.3l4.3 5.7L17.3 4zm-1.1 14.3h1.8L7.1 5.6H5.2l11 12.7z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M14.5 3c.4 2.2 1.8 3.8 4 4.2v2.6c-1.4-.1-2.7-.6-3.8-1.4v6.4c0 3.2-2.5 5.7-5.7 5.7S3.3 18 3.3 14.8 5.8 9.1 9 9.1c.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.7 0-3.1 1.4-3.1 3.1S7.3 18 9 18s3.1-1.4 3.1-3.1V3h2.4z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M22 12.2c0-2.2-.3-3.7-.5-4.5-.3-.9-.9-1.5-1.8-1.8C18 5.5 12 5.5 12 5.5s-6 0-7.7.4c-.9.3-1.5.9-1.8 1.8-.2.8-.5 2.3-.5 4.5s.3 3.7.5 4.5c.3.9.9 1.5 1.8 1.8 1.7.4 7.7.4 7.7.4s6 0 7.7-.4c.9-.3 1.5-.9 1.8-1.8.2-.8.5-2.3.5-4.5zM10.3 15.2V9.2l5.2 3-5.2 3z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M6.5 8.5h3v10h-3v-10zm1.5-4.8a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM10 8.5h2.9v1.4h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.6V18.5h-3v-4.8c0-1.14-.02-2.6-1.58-2.6-1.58 0-1.82 1.24-1.82 2.52v4.88H10V8.5z" />
        </svg>
      );
    default:
      return null;
  }
}

const SOCIAL_COLORS = {
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white',
  twitter: 'bg-slate-900 text-white',
  tiktok: 'bg-slate-900 text-white',
  youtube: 'bg-[#FF0000] text-white',
  linkedin: 'bg-[#0A66C2] text-white',
};

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

          {SOCIAL_LINKS.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-800">Follow us</h2>
              <p className="mt-1 text-sm text-slate-500">
                Updates, farm photos, and offers on social media.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${
                        SOCIAL_COLORS[s.id] || 'bg-brand-100 text-brand-700'
                      }`}
                    >
                      <SocialIcon id={s.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500">Social</div>
                      <div className="font-semibold text-slate-800">{s.label}</div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 text-slate-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4 h-fit">
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
