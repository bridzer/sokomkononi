import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  buildProductShareText,
  copyText,
  facebookShareUrl,
  getProductPageUrl,
  shareProduct,
  twitterShareUrl,
  whatsAppShareUrl,
} from '../utils/share';

export default function ShareProductMenu({ product, className = '', compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!product?.slug) return null;

  const pageUrl = getProductPageUrl(product.slug);
  const shareText = buildProductShareText(product);

  const runNativeShare = async () => {
    setOpen(false);
    if (!product.is_active) {
      toast.error('Activate this product before sharing it publicly.');
      return;
    }
    const result = await shareProduct(product);
    if (result.method === 'native') {
      toast.success('Shared');
    } else if (result.method === 'copy') {
      toast.success('Link copied — paste it on Facebook, WhatsApp, etc.');
    }
  };

  const copyLink = async () => {
    setOpen(false);
    if (!product.is_active) {
      toast.error('Activate this product before sharing it publicly.');
      return;
    }
    await copyText(pageUrl);
    toast.success('Product link copied');
  };

  const openShareWindow = (url) => {
    setOpen(false);
    if (!product.is_active) {
      toast.error('Activate this product before sharing it publicly.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const itemClass =
    'w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className={
          compact
            ? 'text-brand-700 hover:underline'
            : 'btn-outline text-sm py-2 px-3'
        }
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {compact ? 'Share' : 'Share product'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          <button type="button" role="menuitem" className={itemClass} onClick={runNativeShare}>
            <span aria-hidden>📱</span>
            Share…
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={copyLink}>
            <span aria-hidden>🔗</span>
            Copy link
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => openShareWindow(facebookShareUrl(pageUrl))}
          >
            <span aria-hidden>📘</span>
            Facebook
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => openShareWindow(whatsAppShareUrl(pageUrl, shareText))}
          >
            <span aria-hidden>💬</span>
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => openShareWindow(twitterShareUrl(pageUrl, shareText))}
          >
            <span aria-hidden>🐦</span>
            X / Twitter
          </button>
        </div>
      )}
    </div>
  );
}
