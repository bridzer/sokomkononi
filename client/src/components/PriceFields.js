import React from 'react';
import { PRICE_MODES, sanitizePriceInput } from '../utils/pricing';

/**
 * Admin pricing fields — fixed OR range (mutually exclusive).
 */
export default function PriceFields({ value, onChange }) {
  const mode = value.price_type === PRICE_MODES.RANGE ? PRICE_MODES.RANGE : PRICE_MODES.FIXED;
  const isFixed = mode === PRICE_MODES.FIXED;
  const isRange = mode === PRICE_MODES.RANGE;

  const setMode = (price_type) => {
    if (price_type === PRICE_MODES.FIXED) {
      onChange({
        ...value,
        price_type: PRICE_MODES.FIXED,
        price_max: '',
      });
    } else {
      onChange({
        ...value,
        price_type: PRICE_MODES.RANGE,
      });
    }
  };

  const onPriceChange = (field) => (e) => {
    onChange({ ...value, [field]: sanitizePriceInput(e.target.value) });
  };

  return (
    <div className="sm:col-span-2 space-y-3">
      <div>
        <span className="label">Pricing mode *</span>
        <div className="flex flex-wrap gap-3 mt-1">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="price_type"
              checked={isFixed}
              onChange={() => setMode(PRICE_MODES.FIXED)}
            />
            Fixed price
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="price_type"
              checked={isRange}
              onChange={() => setMode(PRICE_MODES.RANGE)}
            />
            Price range
          </label>
        </div>
      </div>

      {isFixed && (
        <div>
          <label className="label" htmlFor="price-fixed">
            Price (KSh) *
          </label>
          <input
            id="price-fixed"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="input"
            placeholder="e.g. 3500"
            value={value.price}
            onChange={onPriceChange('price')}
            required
          />
          <p className="text-xs text-slate-500 mt-1">Numbers only — no letters or symbols</p>
        </div>
      )}

      {isRange && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="price-min">
              Minimum price (KSh) *
            </label>
            <input
              id="price-min"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="input"
              placeholder="e.g. 2000"
              value={value.price}
              onChange={onPriceChange('price')}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="price-max">
              Maximum price (KSh) *
            </label>
            <input
              id="price-max"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="input"
              placeholder="e.g. 5000"
              value={value.price_max}
              onChange={onPriceChange('price_max')}
              required
            />
          </div>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Shown as a range on the shop (e.g. KSh 2,000 – KSh 5,000). Cart uses the minimum
            for estimates; final price confirmed on order.
          </p>
        </div>
      )}
    </div>
  );
}
