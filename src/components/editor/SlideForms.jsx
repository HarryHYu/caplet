import { useState } from 'react';
import api from '../../services/api';

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
    default:
      return (
        <p className="text-sm text-text-muted italic">
          Editor for slide type "{slide.type}" is not available.
        </p>
      );
  }
}
