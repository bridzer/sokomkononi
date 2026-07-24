import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { WHATSAPP_SCRIPT_LIBRARY } from '../../utils/whatsappScripts';

/**
 * Admin helper: copy-ready WhatsApp sale scripts.
 */
export default function AdminScripts() {
  const [active, setActive] = useState(WHATSAPP_SCRIPT_LIBRARY[0].id);

  const entry = WHATSAPP_SCRIPT_LIBRARY.find((s) => s.id === active) || WHATSAPP_SCRIPT_LIBRARY[0];
  const text = entry.build(
    { name: '[Product name]', stock: 5, category_slug: 'dairy-goats' },
    { customerName: '[Customer name]' }
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Script copied — paste into WhatsApp');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800">WhatsApp sale scripts</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-2xl">
        Use these saved replies when customers enquire. Replace bracketed placeholders with real
        names, prices, and counties. Aim to reply within 5 minutes.
      </p>

      <div className="mt-5 grid lg:grid-cols-[220px_1fr] gap-4">
        <div className="card p-2 space-y-1">
          {WHATSAPP_SCRIPT_LIBRARY.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                active === s.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-slate-800">{entry.title}</h2>
            <button type="button" className="btn-primary text-sm py-1.5" onClick={copy}>
              Copy script
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100 font-sans leading-relaxed">
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}
