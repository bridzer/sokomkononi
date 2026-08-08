import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { trackAddToCart, trackRemoveFromCart } from '../utils/analytics';

const CartContext = createContext(null);
const STORAGE_KEY = 'kalro_cart';
const PREFS_KEY = 'kalro_checkout_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw
      ? JSON.parse(raw)
      : { delivery_method: 'soko_delivery', payment_method: 'cod' };
  } catch {
    return { delivery_method: 'soko_delivery', payment_method: 'cod' };
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setDeliveryMethod = (delivery_method) =>
    setPrefs((p) => ({ ...p, delivery_method }));
  const setPaymentMethodPref = (payment_method) =>
    setPrefs((p) => ({ ...p, payment_method }));

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      const fulfilled_by =
        product.fulfilled_by === 'seller' && product.seller_id
          ? 'seller'
          : 'platform';
      return [
        ...prev,
        {
          product_id: product.id,
          slug: product.slug || null,
          name: product.name,
          price: Number(product.price),
          price_type: product.price_type || 'fixed',
          price_max: product.price_max != null ? Number(product.price_max) : null,
          image_url: product.image_url,
          unit: product.unit,
          quantity: qty,
          seller_id: product.seller_id || null,
          seller_display_name:
            product.seller_display_name || product.seller?.name || null,
          fulfilled_by,
        },
      ];
    });
    trackAddToCart(product, qty);
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (product_id, quantity) => {
    if (quantity <= 0) return removeItem(product_id);
    setItems((prev) => prev.map((i) => (i.product_id === product_id ? { ...i, quantity } : i)));
  };

  const removeItem = (product_id) => {
    setItems((prev) => {
      const removed = prev.find((i) => i.product_id === product_id);
      if (removed) trackRemoveFromCart(removed, removed.quantity);
      return prev.filter((i) => i.product_id !== product_id);
    });
  };

  const clear = () => setItems([]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clear,
        total,
        count,
        deliveryMethod: prefs.delivery_method || 'soko_delivery',
        paymentMethodPref: prefs.payment_method || 'cod',
        setDeliveryMethod,
        setPaymentMethodPref,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
