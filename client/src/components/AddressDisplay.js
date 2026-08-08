import React from 'react';
import { formatAddressLines, formatAddressShort } from '../utils/address';

/** Read-only structured address for order confirmation / admin. */
export default function AddressDisplay({ address, compact = false, className = '' }) {
  if (compact) {
    return <span className={className}>{formatAddressShort(address) || '—'}</span>;
  }
  const lines = formatAddressLines(address);
  if (!lines.length) return <span className={className}>—</span>;
  return (
    <div className={`text-sm text-slate-700 space-y-0.5 ${className}`}>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
      {address?.latitude != null && address?.longitude != null ? (
        <div className="text-[11px] text-slate-500 pt-1">
          GPS {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}
        </div>
      ) : null}
    </div>
  );
}
