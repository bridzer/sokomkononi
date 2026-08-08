import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterOptions } from '../utils/address';

/**
 * Simple searchable single-select for long lists (counties, etc.).
 * Keeps native-feel UX: type to filter, click/tap to pick.
 */
export default function SearchableSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Search or select…',
  required = false,
  disabled = false,
  helper,
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => filterOptions(options, query).slice(0, 80), [options, query]);

  const pick = (opt) => {
    onChange?.(opt);
    setQuery(opt);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {label ? (
        <label className="label">
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <input
        className="input w-full"
        value={query}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => !disabled && setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && e.target.value !== value) onChange?.('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length === 1) {
            e.preventDefault();
            pick(filtered[0]);
          }
        }}
      />
      {helper ? <p className="text-[11px] text-slate-500 mt-1">{helper}</p> : null}
      {open && !disabled && (
        <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-brand-50 ${
                    opt === value ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-800'
                  }`}
                  onClick={() => pick(opt)}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
