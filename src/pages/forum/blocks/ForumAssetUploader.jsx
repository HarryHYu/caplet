import { useRef, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';

/** Generic S3-presign upload button for block editors that need { assetId, url } back (image / 3D model blocks). */
export default function ForumAssetUploader({ purpose, accept, label = 'Upload file', onUploaded }) {
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
      const presign = await api.presignUpload({ purpose, mimeType: file.type });
      await api.postToPresignedUrl(presign, file);
      const completed = await api.completeUpload(presign.assetId);
      onUploaded({ assetId: presign.assetId, url: completed.publicUrl });
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line-soft px-3 py-2 text-sm font-semibold text-text-primary hover:bg-surface-soft disabled:opacity-50"
      >
        <ArrowUpTrayIcon className="h-4 w-4" /> {uploading ? 'Uploading…' : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {error && <p className="mt-1.5 text-xs font-semibold text-text-error">{error}</p>}
    </div>
  );
}
