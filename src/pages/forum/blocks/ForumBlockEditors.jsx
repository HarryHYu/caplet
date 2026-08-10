import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ForumContent from '../ForumContent';
import ForumImageUploadButton from '../ForumImageUploadButton';
import ForumAssetUploader from './ForumAssetUploader';
import ForumChartBlock from './ForumChartBlock';
import ForumTableBlock from './ForumTableBlock';
import ForumEmbedIframe from './ForumEmbedIframe';
import Forum3DModelBlock from './Forum3DModelBlock';

const fieldClass = 'w-full rounded-xl px-3 py-2 text-sm';

export function TextBlockEditor({ data, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={5}
        maxLength={8000}
        value={data.markdown || ''}
        onChange={(e) => onChange({ ...data, markdown: e.target.value })}
        placeholder="Write in Markdown — **bold**, `code`, $x^2$ for inline math..."
        className={`${fieldClass} resize-y`}
      />
      <ForumImageUploadButton onInsert={(md) => onChange({ ...data, markdown: `${data.markdown || ''}${md}` })} />
    </div>
  );
}

export function MathBlockEditor({ data, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        maxLength={2000}
        value={data.latex || ''}
        onChange={(e) => onChange({ ...data, latex: e.target.value })}
        placeholder="e.g. \frac{a}{b} = \sqrt{c^2 - d^2}"
        className={fieldClass}
      />
      {data.latex?.trim() && (
        <div className="rounded-xl border border-line-soft bg-surface-soft p-3">
          <ForumContent className="text-center">{`$$${data.latex}$$`}</ForumContent>
        </div>
      )}
    </div>
  );
}

const CODE_LANGUAGES = ['text', 'javascript', 'python', 'java', 'c', 'cpp', 'html', 'css', 'sql', 'bash'];

export function CodeBlockEditor({ data, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <select value={data.language || 'text'} onChange={(e) => onChange({ ...data, language: e.target.value })} className="w-40 rounded-xl px-3 py-1.5 text-xs">
        {CODE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <textarea
        rows={6}
        maxLength={8000}
        value={data.code || ''}
        onChange={(e) => onChange({ ...data, code: e.target.value })}
        placeholder="Paste your working / code here..."
        className={`${fieldClass} resize-y font-mono`}
      />
    </div>
  );
}

export function ImageBlockEditor({ data, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {data.url ? (
        <img src={data.url} alt={data.alt || ''} className="max-h-64 w-auto rounded-xl border border-line-soft" />
      ) : (
        <ForumAssetUploader purpose="forumImage" accept="image/png,image/jpeg,image/webp,image/gif" label="Upload image" onUploaded={({ assetId, url }) => onChange({ ...data, assetId, url })} />
      )}
      {data.url && (
        <input
          type="text"
          maxLength={300}
          value={data.alt || ''}
          onChange={(e) => onChange({ ...data, alt: e.target.value })}
          placeholder="Describe the image (alt text)"
          className={fieldClass}
        />
      )}
    </div>
  );
}

export function Model3DBlockEditor({ data, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {data.url ? (
        <Forum3DModelBlock data={data} />
      ) : (
        <ForumAssetUploader purpose="forumModel" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" label="Upload 3D model (.glb / .gltf)" onUploaded={({ assetId, url }) => onChange({ ...data, assetId, url })} />
      )}
    </div>
  );
}

export function ChartBlockEditor({ data, onChange }) {
  const chartType = data.chartType || 'line';
  const labels = data.labels || [];
  const series = data.series?.length ? data.series : [{ name: 'Series 1', data: [] }];

  const setLabels = (text) => onChange({ ...data, labels: text.split(',').map((s) => s.trim()) });
  const setSeriesValues = (i, text) => {
    const nextSeries = series.map((s, idx) => (idx === i ? { ...s, data: text.split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)) } : s));
    onChange({ ...data, series: nextSeries });
  };
  const setSeriesName = (i, name) => onChange({ ...data, series: series.map((s, idx) => (idx === i ? { ...s, name } : s)) });
  const addSeries = () => onChange({ ...data, series: [...series, { name: `Series ${series.length + 1}`, data: [] }] });
  const removeSeries = (i) => onChange({ ...data, series: series.filter((_, idx) => idx !== i) });

  const preview = { ...data, chartType, labels, series };
  const previewValid = series.some((s) => s.data.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select value={chartType} onChange={(e) => onChange({ ...data, chartType: e.target.value })} className="rounded-xl px-3 py-2 text-sm">
          <option value="line">Line</option>
          <option value="bar">Bar</option>
          <option value="scatter">Scatter</option>
        </select>
        <input type="text" maxLength={200} value={data.title || ''} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Chart title (optional)" className="flex-1 rounded-xl px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="text" maxLength={100} value={data.xLabel || ''} onChange={(e) => onChange({ ...data, xLabel: e.target.value })} placeholder="X axis label" className="flex-1 rounded-xl px-3 py-2 text-sm" />
        <input type="text" maxLength={100} value={data.yLabel || ''} onChange={(e) => onChange({ ...data, yLabel: e.target.value })} placeholder="Y axis label" className="flex-1 rounded-xl px-3 py-2 text-sm" />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-text-muted">Labels (comma-separated, e.g. Q1, Q2, Q3)</span>
        <input type="text" value={labels.join(', ')} onChange={(e) => setLabels(e.target.value)} className={fieldClass} />
      </label>
      {series.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={s.name} onChange={(e) => setSeriesName(i, e.target.value)} className="w-28 shrink-0 rounded-xl px-2 py-2 text-sm" />
          <input type="text" value={s.data.join(', ')} onChange={(e) => setSeriesValues(i, e.target.value)} placeholder="Values (comma-separated, e.g. 4, 8, 15)" className="flex-1 rounded-xl px-2 py-2 text-sm" />
          {series.length > 1 && (
            <button type="button" onClick={() => removeSeries(i)} className="shrink-0 rounded-full p-1.5 text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-4 w-4" /></button>
          )}
        </div>
      ))}
      <button type="button" onClick={addSeries} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-[color:var(--forum-accent)]"><PlusIcon className="h-3.5 w-3.5" /> Add series</button>
      {previewValid && <ForumChartBlock data={preview} />}
    </div>
  );
}

export function TableBlockEditor({ data, onChange }) {
  const columns = data.columns?.length ? data.columns : ['Column 1', 'Column 2'];
  const rows = data.rows || [];

  const setColumn = (i, value) => onChange({ ...data, columns: columns.map((c, idx) => (idx === i ? value : c)) });
  const addColumn = () => onChange({ ...data, columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map((r) => [...r, '']) });
  const removeColumn = (i) => onChange({ ...data, columns: columns.filter((_, idx) => idx !== i), rows: rows.map((r) => r.filter((_, idx) => idx !== i)) });
  const setCell = (r, c, value) => onChange({ ...data, columns, rows: rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)) });
  const addRow = () => onChange({ ...data, columns, rows: [...rows, columns.map(() => '')] });
  const removeRow = (r) => onChange({ ...data, columns, rows: rows.filter((_, idx) => idx !== r) });

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="p-1">
                  <div className="flex items-center gap-1">
                    <input type="text" maxLength={80} value={col} onChange={(e) => setColumn(i, e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs font-bold" />
                    {columns.length > 1 && <button type="button" onClick={() => removeColumn(i)} className="shrink-0 rounded-full p-1 text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-3.5 w-3.5" /></button>}
                  </div>
                </th>
              ))}
              <th className="p-1">
                <button type="button" onClick={addColumn} className="rounded-full p-1.5 text-[color:var(--forum-accent)] hover:bg-surface-soft"><PlusIcon className="h-4 w-4" /></button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {columns.map((_, c) => (
                  <td key={c} className="p-1">
                    <input type="text" maxLength={300} value={row[c] || ''} onChange={(e) => setCell(r, c, e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs" />
                  </td>
                ))}
                <td className="p-1">
                  <button type="button" onClick={() => removeRow(r)} className="rounded-full p-1 text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-[color:var(--forum-accent)]"><PlusIcon className="h-3.5 w-3.5" /> Add row</button>
      {rows.length > 0 && <ForumTableBlock data={{ columns, rows }} />}
    </div>
  );
}

export function GraphBlockEditor({ data, onChange }) {
  const [touched, setTouched] = useState(false);
  const valid = /^https:\/\/www\.desmos\.com\/calculator\/[a-zA-Z0-9]+$/.test(String(data.url || '').split('?')[0]);
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={data.url || ''}
        onChange={(e) => { onChange({ ...data, url: e.target.value }); setTouched(true); }}
        placeholder="https://www.desmos.com/calculator/abc123"
        className={fieldClass}
      />
      <p className="text-xs text-text-muted">Paste a share link from a Desmos calculator graph (desmos.com → Share → Copy Link).</p>
      {touched && data.url && !valid && <p className="text-xs font-semibold text-text-error">That doesn't look like a Desmos calculator link.</p>}
      {valid && <ForumEmbedIframe src={`https://www.desmos.com${new URL(data.url).pathname}?embed`} label="Desmos graph" aspect="4 / 3" />}
    </div>
  );
}

export function GeogebraBlockEditor({ data, onChange }) {
  const [touched, setTouched] = useState(false);
  let valid = false;
  try {
    const u = new URL(data.url || '');
    valid = u.hostname === 'www.geogebra.org' && /^\/(classic|calculator|3d|geometry|m)\/[a-zA-Z0-9]+$/.test(u.pathname);
  } catch { /* invalid URL */ }
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={data.url || ''}
        onChange={(e) => { onChange({ ...data, url: e.target.value }); setTouched(true); }}
        placeholder="https://www.geogebra.org/m/abc123"
        className={fieldClass}
      />
      <p className="text-xs text-text-muted">Paste a GeoGebra material link (geogebra.org/m/..., /classic/..., /3d/...).</p>
      {touched && data.url && !valid && <p className="text-xs font-semibold text-text-error">That doesn't look like a GeoGebra link.</p>}
      {valid && <ForumEmbedIframe src={data.url} label="GeoGebra" aspect="4 / 3" />}
    </div>
  );
}

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
function extractYoutubeIdClient(raw) {
  const value = String(raw || '').trim();
  if (YOUTUBE_ID_RE.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.hostname === 'youtu.be') { const id = u.pathname.slice(1); return YOUTUBE_ID_RE.test(id) ? id : null; }
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(u.hostname)) {
      const v = u.searchParams.get('v');
      if (v && YOUTUBE_ID_RE.test(v)) return v;
      const m = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
      if (m) return m[1];
    }
  } catch { /* not a URL */ }
  return null;
}

export function EmbedBlockEditor({ data, onChange }) {
  const [touched, setTouched] = useState(false);
  const videoId = extractYoutubeIdClient(data.videoId || data.url);
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={data.url ?? data.videoId ?? ''}
        onChange={(e) => { onChange({ ...data, url: e.target.value, videoId: undefined }); setTouched(true); }}
        placeholder="https://www.youtube.com/watch?v=..."
        className={fieldClass}
      />
      <p className="text-xs text-text-muted">Paste a YouTube video link.</p>
      {touched && (data.url || data.videoId) && !videoId && <p className="text-xs font-semibold text-text-error">That doesn't look like a YouTube link.</p>}
      {videoId && <ForumEmbedIframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} label="YouTube video" aspect="16 / 9" />}
    </div>
  );
}
