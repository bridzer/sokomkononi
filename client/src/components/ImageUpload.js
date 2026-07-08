import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export default function ImageUpload({ value, onChange, label = 'Image' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, WEBP, GIF or SVG image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    const form = new FormData();
    form.append('image', file);

    setUploading(true);
    try {
      // Let axios/browser set Content-Type with the multipart boundary.
      const { data } = await api.post('/admin/uploads', form);
      onChange?.(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ImageUpload] upload failed', {
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

  const clear = () => onChange?.('');

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-full sm:w-28 h-36 sm:h-28 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 grid place-items-center overflow-hidden mx-auto sm:mx-0">
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-slate-400 text-center px-2">No image</span>
          )}
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={uploading}
              className="btn-outline text-sm py-2 w-full sm:w-auto"
            >
              {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            </button>
            {value && (
              <button
                type="button"
                onClick={clear}
                disabled={uploading}
                className="btn-ghost text-sm py-2 text-red-600 hover:bg-red-50 w-full sm:w-auto"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            JPG, PNG, WEBP, GIF or SVG · up to 5 MB. Uploaded to server.
          </p>
          {value && (
            <p className="text-xs text-slate-400 mt-1 truncate" title={value}>
              {value}
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
