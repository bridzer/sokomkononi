import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';

const MAX_BYTES = 5 * 1024 * 1024;                          // 5 MB per image
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

/**
 * Multi-image uploader for a product gallery.
 *
 * Props:
 *   - value:    string[]  current ordered list of image URLs
 *   - onChange: (urls) => void
 *   - label:    optional heading
 *   - max:      hard cap on total images (default 10)
 *
 * The first URL in `value` is treated as the cover; the parent component is
 * expected to sync `image_url = value[0]` server-side.
 */
export default function MultiImageUpload({
  value = [],
  onChange,
  label = 'Product images',
  max = 10,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const images = Array.isArray(value) ? value.filter(Boolean) : [];

  const pick = () => inputRef.current?.click();

  const validate = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: only JPG, PNG, WEBP, GIF or SVG`);
      return false;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name}: exceeds 5 MB`);
      return false;
    }
    return true;
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(validate);
    if (!files.length) return;

    const slotsLeft = max - images.length;
    if (slotsLeft <= 0) {
      toast.error(`You can only upload up to ${max} images`);
      return;
    }
    const chosen = files.slice(0, slotsLeft);
    if (files.length > chosen.length) {
      toast(`Only the first ${chosen.length} file(s) will be uploaded (max ${max}).`);
    }

    setUploading(true);
    try {
      // NB: do NOT set Content-Type manually here. axios detects the FormData
      // object and lets the browser add `multipart/form-data; boundary=...`
      // automatically — setting it by hand would strip the boundary and make
      // multer reject the request.
      let uploadedUrls = [];
      if (chosen.length === 1) {
        const form = new FormData();
        form.append('image', chosen[0]);
        const { data } = await api.post('/admin/uploads', form);
        uploadedUrls = [data.url];
      } else {
        const form = new FormData();
        chosen.forEach((f) => form.append('images', f));
        const { data } = await api.post('/admin/uploads/batch', form);
        uploadedUrls = (data.files || []).map((f) => f.url).filter(Boolean);
      }
      if (uploadedUrls.length) {
        onChange?.([...images, ...uploadedUrls]);
        toast.success(
          uploadedUrls.length === 1
            ? 'Image uploaded'
            : `${uploadedUrls.length} images uploaded`
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[MultiImageUpload] upload failed', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      toast.error(
        err.response?.data?.error ||
          err.message ||
          'Upload failed — check console for details'
      );
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e) => {
    const list = e.target.files;
    e.target.value = '';
    handleFiles(list);
  };

  const remove = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  const move = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange?.(next);
  };

  const setCover = (idx) => {
    if (idx === 0) return;
    const next = images.slice();
    const [pick] = next.splice(idx, 1);
    next.unshift(pick);
    onChange?.(next);
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">{label}</label>
          <span className="text-xs text-slate-500">
            {images.length}/{max}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className={`relative group rounded-lg overflow-hidden border ${
              idx === 0 ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200'
            } bg-slate-50`}
          >
            <div className="aspect-square">
              {/* Decorative in the admin editor — the label lives outside. */}
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>

            {idx === 0 && (
              <span className="absolute top-1.5 left-1.5 badge bg-brand-600 text-white text-[10px]">
                Cover
              </span>
            )}

            {/* Controls — always visible on touch devices */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  title="Move left"
                  className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === images.length - 1}
                  title="Move right"
                  className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    title="Set as cover"
                    className="w-7 h-7 rounded bg-white/90 hover:bg-white text-brand-700 grid place-items-center"
                  >
                    ★
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                title="Remove"
                className="w-7 h-7 rounded bg-red-500/95 hover:bg-red-500 text-white grid place-items-center"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/40 text-slate-500 hover:text-brand-700 grid place-items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-1 text-center px-2">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-xs font-medium">
                {uploading ? 'Uploading…' : images.length === 0 ? 'Upload images' : 'Add more'}
              </span>
            </div>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-2">
        JPG, PNG, WEBP, GIF or SVG · up to 5 MB each · max {max} images. The first
        image is used as the product cover; drag the arrows to reorder or click{' '}
        <span className="text-brand-700 font-semibold">★</span> to promote a photo to cover.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
