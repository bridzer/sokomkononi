import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  { id: 'cart', label: 'Cart', to: '/cart' },
  { id: 'shipping', label: 'Contact & shipping', to: '/checkout' },
  { id: 'account', label: 'Account', to: '/checkout/account' },
  { id: 'payment', label: 'Payment', to: '/checkout/payment' },
];

/**
 * @param {'cart'|'shipping'|'account'|'payment'} current
 * @param {{ skipAccount?: boolean }} [opts]
 */
export default function CheckoutStepper({ current, skipAccount = false }) {
  const steps = skipAccount ? STEPS.filter((s) => s.id !== 'account') : STEPS;
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.id === current)
  );

  return (
    <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        const className = `px-2.5 py-1 rounded-full transition-colors ${
          active
            ? 'bg-brand-600 text-white'
            : done
              ? 'bg-brand-100 text-brand-800'
              : 'bg-slate-200 text-slate-600'
        }`;
        if (done && step.to) {
          return (
            <li key={step.id}>
              <Link to={step.to} className={className}>
                {i + 1}. {step.label}
              </Link>
            </li>
          );
        }
        return (
          <li key={step.id} className={className}>
            {i + 1}. {step.label}
          </li>
        );
      })}
    </ol>
  );
}
