import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  buildProductShareText,
  copyText,
  emailShareUrl,
  facebookShareUrl,
  getProductPageUrl,
  isProductShareable,
  linkedInShareUrl,
  openSharePopup,
  shareProduct,
  telegramShareUrl,
  twitterShareUrl,
  whatsAppShareUrl,
} from '../utils/share';
import { trackShare } from '../utils/analytics';

/**
 * Shared product share actions for admin + storefront.
 */
export default function useProductShare(product, { requireActive = false } = {}) {
  const [busy, setBusy] = useState(false);

  const shareable = isProductShareable(product);
  const pageUrl = useMemo(
    () => (shareable ? getProductPageUrl(product.slug) : ''),
    [shareable, product?.slug]
  );
  const shareText = useMemo(() => buildProductShareText(product), [product]);

  const guard = useCallback(() => {
    if (!shareable) {
      toast.error('This product cannot be shared yet.');
      return false;
    }
    if (requireActive && product.is_active === false) {
      toast.error('Activate this product before sharing it publicly.');
      return false;
    }
    return true;
  }, [shareable, requireActive, product?.is_active]);

  const runWithBusy = useCallback(async (fn) => {
    if (busy) return null;
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const shareNative = useCallback(async () => {
    if (!guard()) return null;
    return runWithBusy(async () => {
      const result = await shareProduct(product);
      if (result.method === 'native') {
        trackShare('product', product.id, 'native');
        toast.success('Shared successfully');
      } else if (result.method === 'copy') {
        trackShare('product', product.id, 'copy_link');
        toast.success('Link copied — paste it anywhere');
      }
      return result;
    });
  }, [guard, runWithBusy, product]);

  const copyLink = useCallback(async () => {
    if (!guard()) return null;
    return runWithBusy(async () => {
      try {
        await copyText(pageUrl);
        trackShare('product', product.id, 'copy_link');
        toast.success('Link copied to clipboard');
        return { method: 'copy' };
      } catch {
        toast.error('Could not copy link — try again');
        return null;
      }
    });
  }, [guard, runWithBusy, pageUrl, product]);

  const openPlatform = useCallback(
    async (method, url) => {
      if (!guard()) return null;
      return runWithBusy(async () => {
        trackShare('product', product.id, method);
        const opened = openSharePopup(url);
        if (!opened) {
          try {
            await copyText(pageUrl);
            toast.success('Popup blocked — link copied instead');
          } catch {
            toast.error('Popup blocked. Allow popups or copy the link manually.');
          }
        }
        return { method, opened };
      });
    },
    [guard, runWithBusy, pageUrl, product]
  );

  const shareFacebook = useCallback(
    () => openPlatform('facebook', facebookShareUrl(pageUrl)),
    [openPlatform, pageUrl]
  );

  const shareWhatsApp = useCallback(
    () => openPlatform('whatsapp', whatsAppShareUrl(pageUrl, shareText)),
    [openPlatform, pageUrl, shareText]
  );

  const shareTwitter = useCallback(
    () => openPlatform('twitter', twitterShareUrl(pageUrl, shareText)),
    [openPlatform, pageUrl, shareText]
  );

  const shareTelegram = useCallback(
    () => openPlatform('telegram', telegramShareUrl(pageUrl, shareText)),
    [openPlatform, pageUrl, shareText]
  );

  const shareLinkedIn = useCallback(
    () => openPlatform('linkedin', linkedInShareUrl(pageUrl)),
    [openPlatform, pageUrl]
  );

  const shareEmail = useCallback(() => {
    if (!guard()) return null;
    trackShare('product', product.id, 'email');
    const url = emailShareUrl(
      pageUrl,
      `${product.name} — Kalro Farm Kenya`,
      `${shareText}\n\n${pageUrl}`
    );
    window.location.href = url;
    return { method: 'email' };
  }, [guard, pageUrl, product, shareText]);

  return {
    busy,
    shareable,
    pageUrl,
    shareText,
    shareNative,
    copyLink,
    shareFacebook,
    shareWhatsApp,
    shareTwitter,
    shareTelegram,
    shareLinkedIn,
    shareEmail,
  };
}
