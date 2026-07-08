import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatKsh } from '../utils/format';
import SafeImage, { DEFAULT_FALLBACK } from '../components/SafeImage';

export default function Cart() {
  const { items, updateQty, removeItem, total, clear } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Your cart is empty</h1>
        <p className="text-slate-500 mt-2">Add some products from the shop to get started.</p>
        <Link to="/shop" className="btn-primary mt-6">Browse shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="card overflow-hidden">
          {items.map((i) => (
            <div key={i.product_id} className="flex gap-4 p-4 border-b last:border-b-0 border-slate-100">
              <SafeImage
                src={i.image_url}
                fallback={DEFAULT_FALLBACK}
                alt={i.name}
                className="w-24 h-24 rounded-lg object-cover bg-slate-100"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">{i.name}</div>
                <div className="text-sm text-slate-500">{formatKsh(i.price)} · {i.unit}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 rounded-lg">
                    <button
                      className="px-2 py-1 text-slate-600"
                      onClick={() => updateQty(i.product_id, i.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="px-3 text-sm">{i.quantity}</span>
                    <button
                      className="px-2 py-1 text-slate-600"
                      onClick={() => updateQty(i.product_id, i.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-sm text-red-600 hover:underline ml-2"
                    onClick={() => removeItem(i.product_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right font-semibold text-slate-800">
                {formatKsh(i.price * i.quantity)}
              </div>
            </div>
          ))}
          <div className="p-4 flex justify-end">
            <button onClick={clear} className="text-sm text-slate-500 hover:text-red-600">
              Clear cart
            </button>
          </div>
        </div>

        <aside className="card p-5 h-fit">
          <h2 className="font-semibold text-slate-800 mb-4">Order summary</h2>
          <div className="flex justify-between text-sm py-1">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium">{formatKsh(total)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-slate-600">Delivery</span>
            <span className="font-medium text-brand-700">Free</span>
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-brand-700">{formatKsh(total)}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-4">
            Proceed to checkout
          </Link>
          <Link to="/shop" className="btn-ghost w-full mt-2">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
