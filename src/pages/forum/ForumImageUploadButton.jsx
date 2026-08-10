import { useRef, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

/** Diagrams / handwritten working — reuses the app's existing S3 presign pipeline (purpose: 'forumImage'). */
export default function ForumImageUploadButton({ onInsert }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const presign = await api.presignUpload({ purpose: 'forumImage', mimeType: file.type });
      await api.postToPresignedUrl(presign, file);
      const completed = await api.completeUpload(presign.assetId);
      onInsert(`\n![image](${completed.publicUrl})\n`);
    } catch (err) {
      setError(err.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:bg-surface-soft disabled:opacity-50"
      >
        <PhotoIcon className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Add image'}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFile} />
      {error && <span className="text-xs font-semibold text-text-error">{error}</span>}
    </span>
  );
}
