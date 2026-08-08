import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import {
  buildSingleImageForm,
  formatUploadError,
  validateImageFile,
} from '../utils/upload';

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  uploadBase = '/admin/uploads',
  variant = 'rect', // rect | avatar
  hint = 'JPG, PNG, WEBP or GIF · up to 20 MB. Uploaded to server.',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const isAvatar = variant === 'avatar';

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      e.target.value = '';
      return;
    }

    const form = buildSingleImageForm(file);

    setUploading(true);
    try {
      const { data } = await api.post(uploadBase, form);
      onChange?.(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ImageUpload] upload failed', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        code: err.code,
      });
      toast.error(formatUploadError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const clear = () => onChange?.('');

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className={
            isAvatar
              ? 'w-28 h-28 shrink-0 rounded-full border-2 border-dashed border-brand-200 bg-brand-50 grid place-items-center overflow-hidden mx-auto sm:mx-0 ring-4 ring-brand-50'
              : 'w-full sm:w-28 h-36 sm:h-28 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 grid place-items-center overflow-hidden mx-auto sm:mx-0'
          }
        >
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-slate-400 text-center px-2">
              {isAvatar ? 'Photo' : 'No image'}
            </span>
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
          <p className="text-xs text-slate-500 mt-2">{hint}</p>
          {value && (
            <p className="text-xs text-slate-400 mt-1 truncate" title={value}>
              {value}
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
