import { EMPTY_ADDRESS } from './address';

const DRAFT_KEY = 'kalro_checkout_draft';

export const EMPTY_CHECKOUT_DRAFT = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  notes: '',
  address: { ...EMPTY_ADDRESS },
  delivery_method: 'soko_delivery',
};

export function loadCheckoutDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...EMPTY_CHECKOUT_DRAFT, address: { ...EMPTY_ADDRESS } };
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_CHECKOUT_DRAFT,
      ...parsed,
      address: { ...EMPTY_ADDRESS, ...(parsed.address || {}) },
    };
  } catch {
    return { ...EMPTY_CHECKOUT_DRAFT, address: { ...EMPTY_ADDRESS } };
  }
}

export function saveCheckoutDraft(draft) {
  const next = {
    ...EMPTY_CHECKOUT_DRAFT,
    ...draft,
    address: { ...EMPTY_ADDRESS, ...(draft?.address || {}) },
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  return next;
}

export function clearCheckoutDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

/** Prefill payload for login / register forms. */
export function draftToAuthPrefill(draft = {}) {
  return {
    name: String(draft.customer_name || '').trim(),
    email: String(draft.customer_email || '').trim(),
    phone: String(draft.customer_phone || '').trim(),
  };
}
