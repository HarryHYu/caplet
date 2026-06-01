import { useRef, useState } from 'react';
import api from '../../services/api';
import { PHET_SUBJECTS, getPhetEmbedUrl } from '../../lib/phetSims';

/* ──────────────────────────────────────────────────────────────────────────
   Shared inputs
   ────────────────────────────────────────────────────────────────────────── */

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-text-dim">{hint}</span>}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${props.className || ''}`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${props.className || ''}`}
    />
  );
}

function Select({ value, onChange, options, ...rest }) {
  return (
    <select
      value={value}
      onChange={onChange}
      {...rest}
      className="w-full rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
    >
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        ),
      )}
    </select>
  );
}

function PillButton({ children, onClick, disabled, tone = 'default', type = 'button' }) {
  const cls =
    tone === 'danger'
      ? 'text-rose-500 hover:bg-rose-500/10 border-rose-400/40'
      : tone === 'primary'
        ? 'text-accent hover:bg-accent/10 border-accent/40'
        : 'text-text-muted hover:text-text-primary border-line-soft hover:border-text-dim';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Image picker (URL paste + S3 upload via editor token)
   ────────────────────────────────────────────────────────────────────────── */

export function ImagePicker({ value, onChange, lessonId }) {
  const [tab, setTab] = useState(value ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setUploading(true);
    try {
      const url = await api.uploadLessonImage(f, lessonId);
      onChange(url);
      setTab('url');
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
            tab === 'url' ? 'bg-accent text-white' : 'text-text-muted border border-line-soft'
          }`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
            tab === 'upload' ? 'bg-accent text-white' : 'text-text-muted border border-line-soft'
          }`}
        >
          Upload
        </button>
      </div>
      {tab === 'url' ? (
        <TextInput
          type="url"
          placeholder="https://…"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading || !lessonId}
            onChange={onFile}
            className="block w-full text-sm text-text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-accent file:text-white file:text-xs file:font-bold file:uppercase file:tracking-[0.2em] file:cursor-pointer disabled:opacity-50"
          />
          {!lessonId && (
            <p className="mt-1 text-[11px] text-text-dim">Save the lesson once before uploading.</p>
          )}
          {uploading && <p className="mt-1 text-[11px] text-text-dim">Uploading…</p>}
          {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
        </div>
      )}
      {value && tab === 'url' && (
        <div className="rounded-lg border border-line-soft overflow-hidden bg-surface-soft">
          <img src={api.getProxiedImageSrc(value)} alt="" className="w-full max-h-40 object-cover" />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Type-specific forms
   ────────────────────────────────────────────────────────────────────────── */

function TextForm({ slide, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Content (markdown)" hint="Headings (##), **bold**, lists are supported.">
        <TextArea
          rows={8}
          value={slide.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Write the reading content…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Layout">
          <Select
            value={slide.layout || 'default'}
            onChange={(e) => onChange({ layout: e.target.value })}
            options={['default', 'hero', 'centered', 'callout']}
          />
        </Field>
        <Field label="Tone">
          <Select
            value={slide.tone || 'neutral'}
            onChange={(e) => onChange({ tone: e.target.value })}
            options={['neutral', 'info', 'tip', 'warning', 'example', 'quote']}
          />
        </Field>
      </div>
      <Field label="Caption (optional)">
        <TextInput
          value={slide.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </Field>
    </div>
  );
}

function MediaForm({ slide, onChange, lessonId }) {
  const source = slide.source || 'image';
  return (
    <div className="space-y-3">
      <Field label="Type">
        <Select
          value={source}
          onChange={(e) => onChange({ source: e.target.value })}
          options={[
            { value: 'image', label: 'Image' },
            { value: 'video', label: 'Video (YouTube)' },
            { value: 'audio', label: 'Audio' },
            { value: 'embed', label: 'Embed (iframe URL)' },
          ]}
        />
      </Field>
      {source === 'image' ? (
        <Field label="Image" hint="Paste a URL or upload a file.">
          <ImagePicker
            value={slide.url}
            onChange={(url) => onChange({ url })}
            lessonId={lessonId}
          />
        </Field>
      ) : (
        <Field
          label="URL"
          hint={source === 'video' ? 'Paste a YouTube link.' : source === 'audio' ? 'Paste a direct audio URL.' : 'Paste a URL to embed.'}
        >
          <TextInput
            type="url"
            value={slide.url || ''}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://…"
          />
        </Field>
      )}
      <Field label="Caption (optional)">
        <TextInput
          value={slide.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </Field>
    </div>
  );
}

function ChoiceForm({ slide, onChange }) {
  const options = slide.options || [];
  const correctIndices = slide.correctIndices || [];
  const mode = slide.mode || 'single';

  const setOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    onChange({ options: next });
  };
  const addOption = () => {
    if (options.length >= 8) return;
    onChange({ options: [...options, ''] });
  };
  const removeOption = (i) => {
    const next = options.filter((_, k) => k !== i);
    const nextCorrect = correctIndices
      .filter((c) => c !== i)
      .map((c) => (c > i ? c - 1 : c));
    onChange({ options: next, correctIndices: nextCorrect });
  };
  const toggleCorrect = (i) => {
    if (mode === 'multiple') {
      const set = new Set(correctIndices);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      onChange({ correctIndices: Array.from(set).sort((a, b) => a - b) });
    } else {
      onChange({ correctIndices: [i] });
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Question">
        <TextArea
          rows={2}
          value={slide.question || ''}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </Field>
      <Field label="Mode">
        <Select
          value={mode}
          onChange={(e) => {
            const next = e.target.value;
            const trimmed = next === 'single' && correctIndices.length > 1 ? [correctIndices[0]] : correctIndices;
            onChange({ mode: next, correctIndices: trimmed });
          }}
          options={[
            { value: 'single', label: 'Single answer' },
            { value: 'multiple', label: 'Select all that apply' },
          ]}
        />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">Options</span>
          <PillButton onClick={addOption} tone="primary" disabled={options.length >= 8}>+ Add</PillButton>
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => {
            const isCorrect = correctIndices.includes(i);
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCorrect(i)}
                  title={isCorrect ? 'Marked correct' : 'Mark as correct'}
                  className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600'
                      : 'border-line-soft text-text-dim hover:border-text-dim'
                  }`}
                >
                  {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                </button>
                <TextInput
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-rose-500 hover:border-rose-400/60 disabled:opacity-30"
                  aria-label="Remove option"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-text-dim">
          Click the letter to mark an option correct. {mode === 'multiple' ? 'You can mark multiple.' : 'Pick one.'}
        </p>
      </div>
      <Field label="Explanation (shown after answering)">
        <TextArea
          rows={2}
          value={slide.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TrueFalseForm({ slide, onChange }) {
  // True/False is a Choice slide in disguise — we surface a simpler form.
  const correct = slide.correctIndices?.[0] === 0; // 0 = True
  return (
    <div className="space-y-3">
      <Field label="Statement">
        <TextArea
          rows={2}
          value={slide.question || ''}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="The statement to evaluate…"
        />
      </Field>
      <Field label="Answer">
        <div className="flex gap-2">
          {['True', 'False'].map((label, i) => {
            const active = (i === 0) === correct;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ options: ['True', 'False'], correctIndices: [i], mode: 'truefalse' })}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-line-soft text-text-muted hover:border-text-dim'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Explanation (shown after answering)">
        <TextArea
          rows={2}
          value={slide.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

function FillBlankForm({ slide, onChange }) {
  const blanks = slide.blanks || [];
  // Sync the number of blanks to the count of {{N}} markers in the template
  // whenever the template changes.
  const syncBlanks = (template) => {
    const matches = (template.match(/\{\{(\d+)\}\}/g) || []).map((s) => Number(s.slice(2, -2)));
    const max = matches.length ? Math.max(...matches) + 1 : 0;
    const next = [];
    for (let i = 0; i < max; i++) {
      next.push(blanks[i] || { answers: [''] });
    }
    return next;
  };

  const setAnswer = (i, j, val) => {
    const next = blanks.map((b, k) => {
      if (k !== i) return b;
      const answers = [...(b.answers || [])];
      answers[j] = val;
      return { ...b, answers };
    });
    onChange({ blanks: next });
  };
  const addAnswer = (i) => {
    const next = blanks.map((b, k) =>
      k === i ? { ...b, answers: [...(b.answers || []), ''] } : b,
    );
    onChange({ blanks: next });
  };
  const removeAnswer = (i, j) => {
    const next = blanks.map((b, k) => {
      if (k !== i) return b;
      const answers = (b.answers || []).filter((_, x) => x !== j);
      return { ...b, answers: answers.length ? answers : [''] };
    });
    onChange({ blanks: next });
  };

  return (
    <div className="space-y-3">
      <Field
        label="Template"
        hint="Use {{0}}, {{1}}, … for each blank. Order matches the answer rows below."
      >
        <TextArea
          rows={3}
          value={slide.template || ''}
          onChange={(e) => onChange({ template: e.target.value, blanks: syncBlanks(e.target.value) })}
          placeholder="The capital of Australia is {{0}}."
        />
      </Field>
      {blanks.map((b, i) => (
        <div key={i} className="rounded-lg border border-line-soft p-3 bg-surface-soft/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">
              Blank {i + 1} answers
            </span>
            <PillButton onClick={() => addAnswer(i)} tone="primary">+ Alt answer</PillButton>
          </div>
          <div className="space-y-1.5">
            {(b.answers || ['']).map((ans, j) => (
              <div key={j} className="flex items-center gap-2">
                <TextInput
                  value={ans}
                  onChange={(e) => setAnswer(i, j, e.target.value)}
                  placeholder={j === 0 ? 'Correct answer' : 'Alternative spelling / answer'}
                />
                <button
                  type="button"
                  onClick={() => removeAnswer(i, j)}
                  disabled={(b.answers || []).length <= 1}
                  className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-rose-500 disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Field label="Explanation (shown after answering)">
        <TextArea
          rows={2}
          value={slide.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

function CardsForm({ slide, onChange, lessonId }) {
  const cards = slide.cards || [];
  const setCard = (i, patch) => {
    const next = cards.map((c, k) => (k === i ? { ...c, ...patch } : c));
    onChange({ cards: next });
  };
  const addCard = () => onChange({ cards: [...cards, { front: '', back: '' }] });
  const removeCard = (i) => onChange({ cards: cards.filter((_, k) => k !== i) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Layout">
          <Select
            value={slide.mode || 'carousel'}
            onChange={(e) => onChange({ mode: e.target.value })}
            options={[
              { value: 'carousel', label: 'Carousel (flip)' },
              { value: 'flip', label: 'Grid (flip)' },
              { value: 'grid', label: 'Grid (open)' },
            ]}
          />
        </Field>
        <Field label="Columns (grid only)">
          <Select
            value={String(slide.columns || 2)}
            onChange={(e) => onChange({ columns: Number(e.target.value) })}
            options={['1', '2', '3', '4']}
          />
        </Field>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">Cards</span>
          <PillButton onClick={addCard} tone="primary">+ Add card</PillButton>
        </div>
        <div className="space-y-2">
          {cards.map((c, i) => (
            <div key={i} className="rounded-lg border border-line-soft p-3 bg-surface-soft/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-dim">Card {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCard(i)}
                  disabled={cards.length <= 1}
                  className="text-[11px] text-text-dim hover:text-rose-500 disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
              <TextInput
                value={c.front || ''}
                onChange={(e) => setCard(i, { front: e.target.value })}
                placeholder="Front"
              />
              <TextInput
                value={c.back || ''}
                onChange={(e) => setCard(i, { back: e.target.value })}
                placeholder="Back (optional)"
              />
              <div>
                <ImagePicker
                  value={c.image}
                  onChange={(image) => setCard(i, { image: image || undefined })}
                  lessonId={lessonId}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Field label="Caption (optional)">
        <TextInput
          value={slide.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </Field>
    </div>
  );
}

function MatchForm({ slide, onChange }) {
  const pairs = slide.pairs || [];
  const setPair = (i, patch) => {
    const next = pairs.map((p, k) => (k === i ? { ...p, ...patch } : p));
    onChange({ pairs: next });
  };
  const addPair = () => onChange({ pairs: [...pairs, { left: '', right: '' }] });
  const removePair = (i) => onChange({ pairs: pairs.filter((_, k) => k !== i) });

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">Pairs</span>
          <PillButton onClick={addPair} tone="primary">+ Add pair</PillButton>
        </div>
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-dim w-6 shrink-0">{i + 1}.</span>
              <TextInput
                value={p.left || ''}
                onChange={(e) => setPair(i, { left: e.target.value })}
                placeholder="Term"
              />
              <span className="text-text-dim shrink-0">→</span>
              <TextInput
                value={p.right || ''}
                onChange={(e) => setPair(i, { right: e.target.value })}
                placeholder="Match"
              />
              <button
                type="button"
                onClick={() => removePair(i)}
                disabled={pairs.length <= 2}
                className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-rose-500 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-text-dim">The right column will be shuffled for students.</p>
      </div>
      <Field label="Explanation (shown after answering)">
        <TextArea
          rows={2}
          value={slide.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

function OrderForm({ slide, onChange }) {
  const items = slide.items || [];
  const setItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange({ items: next });
  };
  const addItem = () => onChange({ items: [...items, ''] });
  const removeItem = (i) => onChange({ items: items.filter((_, k) => k !== i) });
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ items: next });
  };
  return (
    <div className="space-y-3">
      <Field label="Prompt (optional)">
        <TextInput
          value={slide.prompt || ''}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="e.g. Order these events by date"
        />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">
            Items (in correct order)
          </span>
          <PillButton onClick={addItem} tone="primary">+ Add item</PillButton>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-dim w-6 shrink-0">{i + 1}.</span>
              <TextInput
                value={it}
                onChange={(e) => setItem(i, e.target.value)}
                placeholder="Step / item"
              />
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-text-primary disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-text-primary disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length <= 2}
                className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-rose-500 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-text-dim">
          Students will see these shuffled and rearrange to match this order.
        </p>
      </div>
      <Field label="Explanation (shown after answering)">
        <TextArea
          rows={2}
          value={slide.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TableForm({ slide, onChange }) {
  const rows = slide.rows || [];
  const cols = rows[0]?.length || 0;
  const setCell = (r, c, val) => {
    const next = rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row));
    onChange({ rows: next });
  };
  const addRow = () => onChange({ rows: [...rows, new Array(cols || 1).fill('')] });
  const removeRow = (r) => onChange({ rows: rows.filter((_, i) => i !== r) });
  const addCol = () => onChange({ rows: rows.map((row) => [...row, '']) });
  const removeCol = (c) => onChange({ rows: rows.map((row) => row.filter((_, i) => i !== c)) });

  return (
    <div className="space-y-3">
      <Field label="Headers">
        <Select
          value={slide.headers || 'none'}
          onChange={(e) => onChange({ headers: e.target.value })}
          options={[
            { value: 'none', label: 'No headers' },
            { value: 'row', label: 'First row is header' },
            { value: 'column', label: 'First column is header' },
            { value: 'both', label: 'Both' },
          ]}
        />
      </Field>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="p-1 align-top">
                    <TextArea
                      rows={2}
                      className="w-40 text-xs"
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-1">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    disabled={rows.length <= 1}
                    className="text-[11px] text-text-dim hover:text-rose-500 disabled:opacity-30"
                  >
                    Remove row
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeCol(c)}
                    disabled={cols <= 1}
                    className="text-[11px] text-text-dim hover:text-rose-500 disabled:opacity-30"
                  >
                    Remove col
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <PillButton onClick={addRow} tone="primary">+ Row</PillButton>
        <PillButton onClick={addCol} tone="primary">+ Column</PillButton>
      </div>
      <Field label="Caption (optional)">
        <TextInput
          value={slide.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </Field>
    </div>
  );
}

function DividerForm({ slide, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <TextInput
          value={slide.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Section title"
        />
      </Field>
      <Field label="Subtitle (optional)">
        <TextInput
          value={slide.subtitle || ''}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Chart editor
   ────────────────────────────────────────────────────────────────────────── */

function ChartForm({ slide, onChange }) {
  const data = slide.data || [];

  const setCell = (i, key, val) => {
    const next = data.map((row, ri) => (ri === i ? { ...row, [key]: val } : row));
    onChange({ data: next });
  };
  const addRow = () => {
    const chartType = slide.chartType;
    onChange({ data: [...data, chartType === 'pie' ? { name: '', value: 0 } : { x: '', y: 0 }] });
  };
  const removeRow = (i) => onChange({ data: data.filter((_, ri) => ri !== i) });

  const isPie = slide.chartType === 'pie';

  return (
    <div className="space-y-3">
      <Field label="Chart type">
        <Select
          value={slide.chartType || 'bar'}
          onChange={(e) => onChange({ chartType: e.target.value })}
          options={[
            { value: 'bar', label: 'Bar chart' },
            { value: 'line', label: 'Line chart' },
            { value: 'area', label: 'Area chart' },
            { value: 'pie', label: 'Pie chart' },
            { value: 'scatter', label: 'Scatter plot' },
          ]}
        />
      </Field>
      <Field label="Title (optional)">
        <TextInput value={slide.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      {!isPie && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="X-axis label">
            <TextInput value={slide.xLabel || ''} onChange={(e) => onChange({ xLabel: e.target.value })} />
          </Field>
          <Field label="Y-axis label">
            <TextInput value={slide.yLabel || ''} onChange={(e) => onChange({ yLabel: e.target.value })} />
          </Field>
        </div>
      )}
      <Field label="Data">
        <div className="space-y-1.5 mb-2">
          {data.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              {isPie ? (
                <>
                  <TextInput className="flex-1" placeholder="Name" value={row.name ?? ''} onChange={(e) => setCell(i, 'name', e.target.value)} />
                  <TextInput className="w-24" placeholder="Value" type="number" value={row.value ?? ''} onChange={(e) => setCell(i, 'value', Number(e.target.value))} />
                </>
              ) : (
                <>
                  <TextInput className="flex-1" placeholder="X" value={row.x ?? ''} onChange={(e) => setCell(i, 'x', e.target.value)} />
                  <TextInput className="w-24" placeholder="Y" type="number" value={row.y ?? ''} onChange={(e) => setCell(i, 'y', Number(e.target.value))} />
                </>
              )}
              <button type="button" onClick={() => removeRow(i)} disabled={data.length <= 1} className="text-text-dim hover:text-rose-500 disabled:opacity-30 text-sm px-1">×</button>
            </div>
          ))}
        </div>
        <PillButton onClick={addRow} tone="primary">+ Add row</PillButton>
      </Field>
      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Diagram editor (Mermaid)
   ────────────────────────────────────────────────────────────────────────── */

function DiagramForm({ slide, onChange }) {
  return (
    <div className="space-y-3">
      <Field
        label="Diagram code (Mermaid syntax)"
        hint="Supports: graph, flowchart, sequenceDiagram, classDiagram, pie, gantt, erDiagram, mindmap"
      >
        <TextArea
          rows={10}
          className="font-mono text-xs"
          placeholder={'graph TD\n  A[Start] --> B{Decision?}\n  B -->|Yes| C[Done]\n  B -->|No| A'}
          value={slide.code || ''}
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </Field>
      <p className="text-[11px] text-text-dim">
        Learn Mermaid syntax at{' '}
        <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          mermaid.js.org
        </a>
      </p>
      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Embed editor
   ────────────────────────────────────────────────────────────────────────── */

/* ── PhET Simulation Picker ─────────────────────────────────────────────── */

function PhETPickerModal({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');

  const subjects = ['All', ...PHET_SUBJECTS.map((s) => s.label)];

  const filtered = PHET_SUBJECTS.flatMap((group) =>
    (activeSubject === 'All' || group.label === activeSubject)
      ? group.sims.filter(
          (s) =>
            !query ||
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.desc.toLowerCase().includes(query.toLowerCase()),
        ).map((s) => ({ ...s, subject: group.label }))
      : [],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close" />
      <div className="relative z-10 bg-surface-raised border border-line-soft rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[85vh]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent mb-0.5">PhET Interactive Simulations</p>
            <p className="text-sm text-text-muted">{filtered.length} simulations</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border border-line-soft text-text-muted hover:text-text-primary flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search + subject filter */}
        <div className="shrink-0 px-5 py-3 border-b border-line-soft space-y-2">
          <input
            type="search"
            autoFocus
            placeholder="Search simulations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-line-soft bg-surface-soft px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSubject(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  activeSubject === s
                    ? 'bg-accent text-white'
                    : 'border border-line-soft text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-8">No simulations match "{query}"</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filtered.map((sim) => (
                <button
                  key={sim.slug}
                  type="button"
                  onClick={() => onSelect(sim)}
                  className="group text-left p-3 rounded-xl border border-line-soft bg-surface-soft hover:border-accent hover:bg-accent/[0.04] transition-all"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70 mb-1">{sim.subject}</p>
                  <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">{sim.name}</p>
                  <p className="text-[11px] text-text-dim mt-1 leading-snug">{sim.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Google Maps URL Builder ────────────────────────────────────────────── */

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

function MapsBuilder({ onApply, onClose }) {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(10);
  const [mapType, setMapType] = useState('roadmap');

  const buildUrl = () => {
    if (!MAPS_KEY) return null;
    const base = 'https://www.google.com/maps/embed/v1';
    const params = new URLSearchParams({ key: MAPS_KEY });
    if (mode === 'search') {
      params.set('q', query);
    } else {
      params.set('q', query);
      params.set('zoom', zoom);
      params.set('maptype', mapType);
    }
    return `${base}/${mode === 'satellite' ? 'place' : 'search'}?${params}`;
  };

  const apply = () => {
    const url = buildUrl();
    if (!url) return;
    onApply({ url, title: query || 'Map', aspect: '16:9' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close" />
      <div className="relative z-10 bg-surface-raised border border-line-soft rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent mb-0.5">Google Maps</p>
            <p className="text-sm text-text-muted">Search for a place or location</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border border-line-soft text-text-muted hover:text-text-primary flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!MAPS_KEY && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-bold mb-1">Maps API key not configured</p>
            <p className="text-[12px]">Add <code className="font-mono bg-black/10 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to your environment variables. Get a key from <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">Google Cloud Console</a> → Maps Embed API.</p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">Place or address</label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Amazon Rainforest, Brazil"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && query && apply()}
            className="w-full rounded-lg border border-line-soft bg-surface-soft px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">Map type</label>
          <div className="flex gap-2">
            {[['roadmap', 'Road'], ['satellite', 'Satellite'], ['terrain', 'Terrain']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMapType(v)}
                className={`flex-1 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  mapType === v ? 'border-accent bg-accent/10 text-accent' : 'border-line-soft text-text-muted hover:border-accent/60'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">Zoom level — {zoom}</label>
          <input type="range" min={1} max={20} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-accent" />
          <div className="flex justify-between text-[10px] text-text-dim mt-0.5"><span>World</span><span>City</span><span>Street</span></div>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={!query || !MAPS_KEY}
          className="btn-primary w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Insert map
        </button>
      </div>
    </div>
  );
}

/* ── EmbedForm ──────────────────────────────────────────────────────────── */

function EmbedForm({ slide, onChange }) {
  const [showPhet, setShowPhet] = useState(false);
  const [showMaps, setShowMaps] = useState(false);

  return (
    <div className="space-y-3">
      {/* Quick-insert buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowPhet(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft hover:border-accent hover:bg-accent/[0.04] transition-all text-sm font-bold text-text-primary"
        >
          <span className="text-base">🔬</span> Browse PhET Simulations
        </button>
        <button
          type="button"
          onClick={() => setShowMaps(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft hover:border-accent hover:bg-accent/[0.04] transition-all text-sm font-bold text-text-primary"
        >
          <span className="text-base">🗺️</span> Google Maps
        </button>
        <button
          type="button"
          onClick={() => onChange({ url: 'https://www.geogebra.org/classic', title: 'GeoGebra' })}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft hover:border-accent hover:bg-accent/[0.04] transition-all text-sm font-bold text-text-primary"
        >
          <span className="text-base">📐</span> GeoGebra
        </button>
      </div>

      <Field label="URL">
        <TextInput
          placeholder="https://phet.colorado.edu/sims/html/…"
          value={slide.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Field>
      <Field label="Display title (shown as kicker)">
        <TextInput
          placeholder="e.g. PhET: Wave on a String"
          value={slide.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="Aspect ratio">
        <Select
          value={slide.aspect || '16:9'}
          onChange={(e) => onChange({ aspect: e.target.value })}
          options={[
            { value: '16:9', label: '16:9 — widescreen (default)' },
            { value: '4:3', label: '4:3 — square-ish' },
            { value: '1:1', label: '1:1 — square' },
            { value: 'tall', label: 'Tall — portrait (9:16)' },
          ]}
        />
      </Field>
      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>

      {showPhet && (
        <PhETPickerModal
          onSelect={(sim) => {
            onChange({ url: getPhetEmbedUrl(sim.slug), title: `PhET: ${sim.name}`, aspect: '16:9' });
            setShowPhet(false);
          }}
          onClose={() => setShowPhet(false)}
        />
      )}
      {showMaps && (
        <MapsBuilder
          onApply={(patch) => onChange(patch)}
          onClose={() => setShowMaps(false)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Hotspot editor — upload image, click to place regions
   ────────────────────────────────────────────────────────────────────────── */

function HotspotForm({ slide, onChange, lessonId }) {
  const regions = slide.regions || [];
  const imgRef = useRef(null);

  const handleImageClick = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    const newId = regions.length ? Math.max(...regions.map((r) => r.id)) + 1 : 0;
    onChange({ regions: [...regions, { id: newId, label: `Region ${newId + 1}`, x: Number(x) - 5, y: Number(y) - 5, w: 10, h: 10, correct: false }] });
  };

  const updateRegion = (id, patch) => onChange({ regions: regions.map((r) => r.id === id ? { ...r, ...patch } : r) });
  const removeRegion = (id) => onChange({ regions: regions.filter((r) => r.id !== id) });

  return (
    <div className="space-y-3">
      <Field label="Question">
        <TextInput
          placeholder="Click on the mitochondria"
          value={slide.question || ''}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </Field>
      <Field label="Image">
        <ImagePicker value={slide.image || ''} onChange={(url) => onChange({ image: url })} lessonId={lessonId} />
      </Field>

      {slide.image && (
        <>
          <p className="text-[11px] text-text-dim">Click on the image below to add a region. Then edit each region's label, size, and whether it's correct.</p>
          <div className="relative rounded-xl overflow-hidden border border-line-soft cursor-crosshair">
            <img
              ref={imgRef}
              src={slide.image}
              alt="Hotspot editor"
              className="w-full h-auto block"
              draggable={false}
              onClick={handleImageClick}
            />
            {regions.map((r) => (
              <div
                key={r.id}
                style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                className={`absolute border-2 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${r.correct ? 'border-emerald-400 bg-emerald-400/30' : 'border-accent bg-accent/20'}`}
              >
                {r.id + 1}
              </div>
            ))}
          </div>

          {regions.length > 0 && (
            <div className="space-y-2">
              {regions.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-line-soft bg-surface-raised space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-dim w-6">{r.id + 1}.</span>
                    <TextInput
                      className="flex-1"
                      placeholder="Label"
                      value={r.label || ''}
                      onChange={(e) => updateRegion(r.id, { label: e.target.value })}
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0 cursor-pointer">
                      <input type="checkbox" checked={!!r.correct} onChange={(e) => updateRegion(r.id, { correct: e.target.checked })} className="accent-accent" />
                      Correct
                    </label>
                    <button type="button" onClick={() => removeRegion(r.id)} className="text-text-dim hover:text-rose-500 text-sm px-1">×</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['x', 'y', 'w', 'h'].map((k) => (
                      <label key={k} className="block">
                        <span className="text-[10px] text-text-dim uppercase">{k === 'w' ? 'Width %' : k === 'h' ? 'Height %' : k.toUpperCase() + ' %'}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={r[k] ?? 0}
                          onChange={(e) => updateRegion(r.id, { [k]: Number(e.target.value) })}
                          className="w-full rounded-md border border-line-soft bg-surface-raised px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Field label="Explanation (shown after answer)">
        <TextArea rows={2} value={slide.explanation || ''} onChange={(e) => onChange({ explanation: e.target.value })} />
      </Field>
      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Timeline editor
   ────────────────────────────────────────────────────────────────────────── */

function TimelineForm({ slide, onChange }) {
  const events = slide.events || [];

  const updateEvent = (i, patch) => onChange({ events: events.map((e, ei) => (ei === i ? { ...e, ...patch } : e)) });
  const addEvent = () => onChange({ events: [...events, { label: '', year: '' }] });
  const removeEvent = (i) => onChange({ events: events.filter((_, ei) => ei !== i) });
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= events.length) return;
    const next = [...events];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ events: next });
  };

  return (
    <div className="space-y-3">
      <Field label="Prompt (optional)">
        <TextInput
          placeholder="Put these events in the correct order"
          value={slide.prompt || ''}
          onChange={(e) => onChange({ prompt: e.target.value })}
        />
      </Field>
      <Field label="Events (in correct chronological order — player shuffles them)" hint="Add the year/date to show after the student submits.">
        <div className="space-y-2 mb-2">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-text-dim hover:text-text-primary disabled:opacity-20 text-xs leading-none">↑</button>
                <button type="button" disabled={i === events.length - 1} onClick={() => move(i, 1)} className="text-text-dim hover:text-text-primary disabled:opacity-20 text-xs leading-none">↓</button>
              </div>
              <span className="text-[10px] font-mono text-text-dim w-5 shrink-0">{i + 1}.</span>
              <TextInput
                className="flex-1"
                placeholder="Event label"
                value={ev.label || ''}
                onChange={(e) => updateEvent(i, { label: e.target.value })}
              />
              <TextInput
                className="w-24"
                placeholder="Year"
                value={ev.year || ''}
                onChange={(e) => updateEvent(i, { year: e.target.value })}
              />
              <button type="button" onClick={() => removeEvent(i)} disabled={events.length <= 2} className="text-text-dim hover:text-rose-500 disabled:opacity-30 text-sm px-1">×</button>
            </div>
          ))}
        </div>
        <PillButton onClick={addEvent} tone="primary">+ Add event</PillButton>
      </Field>
      <Field label="Explanation (shown after answer)">
        <TextArea rows={2} value={slide.explanation || ''} onChange={(e) => onChange({ explanation: e.target.value })} />
      </Field>
      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Desmos
   ────────────────────────────────────────────────────────────────────────── */

const EXPR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

function DesmosForm({ slide, onChange }) {
  const expressions = slide.expressions || [];
  const bounds = slide.bounds || { left: -10, right: 10, bottom: -10, top: 10 };

  const updateExpr = (i, patch) => {
    const next = expressions.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    onChange({ expressions: next });
  };

  const addExpr = () => {
    const id = `e${expressions.length + 1}`;
    onChange({ expressions: [...expressions, { id, latex: '', color: EXPR_COLORS[expressions.length % EXPR_COLORS.length] }] });
  };

  const removeExpr = (i) => onChange({ expressions: expressions.filter((_, idx) => idx !== i) });

  const updateBounds = (key, val) => {
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed)) onChange({ bounds: { ...bounds, [key]: parsed } });
  };

  return (
    <div className="space-y-4">
      <Field label="Title (optional)">
        <TextInput
          placeholder="e.g. Explore the parabola"
          value={slide.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>

      <Field
        label="Expressions"
        hint="Enter LaTeX. e.g. y=x^2  or  x^2+y^2=25  or  a=2 (slider)"
      >
        <div className="space-y-2 mb-2">
          {expressions.map((expr, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={expr.color || '#6366f1'}
                onChange={(e) => updateExpr(i, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-line-soft shrink-0"
                title="Expression colour"
              />
              <input
                type="text"
                value={expr.latex || ''}
                onChange={(e) => updateExpr(i, { latex: e.target.value, id: expr.id || `e${i + 1}` })}
                placeholder="LaTeX expression"
                className="flex-1 rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm font-mono text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => removeExpr(i)}
                disabled={expressions.length <= 1}
                className="text-text-dim hover:text-rose-500 disabled:opacity-30 text-sm px-1 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <PillButton onClick={addExpr} tone="primary">+ Add expression</PillButton>
      </Field>

      <Field label="Viewport bounds (optional)" hint="Set the visible window of the graph.">
        <div className="grid grid-cols-2 gap-2">
          {[['left', 'Left (x min)'], ['right', 'Right (x max)'], ['bottom', 'Bottom (y min)'], ['top', 'Top (y max)']].map(([k, label]) => (
            <label key={k} className="block">
              <span className="block text-[10px] text-text-dim mb-1">{label}</span>
              <TextInput
                type="number"
                value={bounds[k] ?? ''}
                onChange={(e) => updateBounds(k, e.target.value)}
                placeholder={k === 'left' || k === 'bottom' ? '-10' : '10'}
              />
            </label>
          ))}
        </div>
      </Field>

      <Field label="Caption (optional)">
        <TextInput value={slide.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Dispatcher
   ────────────────────────────────────────────────────────────────────────── */

export default function SlideForm({ slide, onChange, lessonId }) {
  if (!slide) return null;
  const update = (patch) => onChange({ ...slide, ...patch });

  if (slide.type === 'choice' && slide.mode === 'truefalse') {
    return <TrueFalseForm slide={slide} onChange={update} />;
  }

  switch (slide.type) {
    case 'text': return <TextForm slide={slide} onChange={update} />;
    case 'media': return <MediaForm slide={slide} onChange={update} lessonId={lessonId} />;
    case 'choice': return <ChoiceForm slide={slide} onChange={update} />;
    case 'fillblank': return <FillBlankForm slide={slide} onChange={update} />;
    case 'cards': return <CardsForm slide={slide} onChange={update} lessonId={lessonId} />;
    case 'match': return <MatchForm slide={slide} onChange={update} />;
    case 'order': return <OrderForm slide={slide} onChange={update} />;
    case 'table': return <TableForm slide={slide} onChange={update} />;
    case 'divider': return <DividerForm slide={slide} onChange={update} />;
    case 'chart': return <ChartForm slide={slide} onChange={update} />;
    case 'diagram': return <DiagramForm slide={slide} onChange={update} />;
    case 'embed': return <EmbedForm slide={slide} onChange={update} />;
    case 'hotspot': return <HotspotForm slide={slide} onChange={update} lessonId={lessonId} />;
    case 'timeline': return <TimelineForm slide={slide} onChange={update} />;
    case 'desmos': return <DesmosForm slide={slide} onChange={update} />;
    default:
      return (
        <p className="text-sm text-text-muted italic">
          Editor for slide type "{slide.type}" is not available.
        </p>
      );
  }
}
