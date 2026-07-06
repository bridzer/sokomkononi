import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { BUSINESS, whatsappUrl } from '../utils/format';

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
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold">P</div>
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <a href={`tel:${BUSINESS.phoneIntl}`} className="font-semibold text-slate-800">
                  {BUSINESS.phone}
                </a>
              </div>
            </div>
            <a
              href={whatsappUrl(`Hello ${BUSINESS.name}, I'd like to talk.`)}
              target="_blank"
              rel="noreferrer"
              className="card p-4 flex items-center gap-3 hover:bg-slate-50"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] text-white grid place-items-center font-bold">W</div>
              <div>
                <div className="text-xs text-slate-500">WhatsApp</div>
                <div className="font-semibold text-slate-800">{BUSINESS.phone}</div>
              </div>
            </a>
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
