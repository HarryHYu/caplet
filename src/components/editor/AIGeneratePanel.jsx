import { useRef, useState } from 'react';
import api from '../../services/api';
import { extractPdfText } from '../../lib/pdfExtract';

const FOCUS_OPTIONS = [
  { value: 'full', label: 'Full lesson — mix of reading, examples, and practice' },
  { value: 'practice', label: 'Practice questions — MCQ, fill blank, match, order' },
  { value: 'flashcards', label: 'Flashcards only — term / definition cards' },
  { value: 'summary', label: 'Summary — key points, tables, dividers' },
];

const PLACEHOLDER_NOTES = `Examples of what works here:
• Paste lecture notes, textbook paragraphs, or dot points
• Describe a topic: "Explain opportunity cost for Year 11 Economics"
• Be specific: "10 practice MCQs on Newton's laws, NESA syllabus"`;

export default function AIGeneratePanel({ open, onClose, lessonTitle, onApply }) {
  const [notes, setNotes] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [audience, setAudience] = useState('');
  const [focus, setFocus] = useState('full');
  const [pdfState, setPdfState] = useState(null); // null | 'extracting' | { name, chars }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const fileRef = useRef(null);

  if (!open) return null;

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPdfState('extracting');
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) throw new Error('Could not extract any text from this PDF. It may be image-only — try pasting the text manually.');
      // Don't show text in the textarea; store separately and combine at submit.
      setPdfState({ name: file.name, chars: text.length, text });
    } catch (err) {
      setError(err.message || 'PDF extraction failed');
      setPdfState(null);
    } finally {
      e.target.value = '';
    }
  };

  const removePdf = () => setPdfState(null);

  const submit = async (mode) => {
    setError('');
    setWarnings([]);

    const sourceText = pdfState?.text || '';
    const combined = [sourceText, notes].filter(Boolean).join('\n\n').trim();

    if (!combined || combined.length < 20) {
      setError('Add some notes, a PDF, or describe what you want (at least 20 characters).');
      return;
    }
    if (combined.length > 14000) {
      setError('Content is too long (max ~14,000 characters). Trim your notes or use a shorter PDF section.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.aiGenerateLesson({
        notes: combined,
        title: lessonTitle,
        curriculum: curriculum.trim() || undefined,
        audience: audience.trim() || undefined,
        focus,
      });
      onApply(res.slides || [], mode);
      setWarnings(res.warnings || []);
      if (!res.warnings?.length) {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close AI panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <aside className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-surface-raised border-l border-line-soft shadow-2xl flex flex-col">
        {/* Header */}
        <header className="shrink-0 px-6 pt-6 pb-4 border-b border-line-soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">AI assist</p>
          <h2 className="text-xl font-serif italic text-text-primary">Generate slides</h2>
          <p className="mt-1 text-sm text-text-muted">
            Paste notes, upload a PDF, or describe what you want. The AI drafts slides into the editor — you review and save.
          </p>
        </header>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

          {/* Notes / topic */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              Notes or topic <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={7}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={PLACEHOLDER_NOTES}
              className="w-full rounded-lg border border-line-soft bg-surface-body px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-text-dim">{notes.length.toLocaleString()} chars</span>
              {pdfState?.text && (
                <span className="text-[11px] text-text-dim">
                  + {pdfState.chars.toLocaleString()} from PDF
                </span>
              )}
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              PDF (optional)
            </label>
            {pdfState === 'extracting' ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Extracting text…
              </div>
            ) : pdfState ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06]">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="flex-1 min-w-0 text-sm text-text-primary truncate" title={pdfState.name}>
                  {pdfState.name}
                </span>
                <span className="text-[11px] text-text-dim shrink-0">{pdfState.chars.toLocaleString()} chars</span>
                <button
                  type="button"
                  onClick={removePdf}
                  className="text-text-dim hover:text-rose-500 shrink-0 text-sm"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 rounded-lg border border-dashed border-line-soft text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
                >
                  Upload PDF
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdf}
                />
                <p className="mt-1 text-[11px] text-text-dim">Text-based PDFs only. Scanned / image PDFs won't extract well.</p>
              </>
            )}
          </div>

          {/* Curriculum */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              Curriculum / syllabus <span className="text-text-dim font-normal normal-case tracking-normal">(optional but recommended)</span>
            </label>
            <input
              type="text"
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              placeholder="e.g. NSW Year 11 Economics 2025, AP Physics 1, GCSE Chemistry AQA"
              className="w-full rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              Audience / year level <span className="text-text-dim font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Year 10 students, University first year, Adult beginners"
              className="w-full rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Output focus */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              Output focus
            </label>
            <div className="space-y-1.5">
              {FOCUS_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="focus"
                    value={o.value}
                    checked={focus === o.value}
                    onChange={() => setFocus(o.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <span className="text-sm text-text-primary leading-snug">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error / warnings */}
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/[0.06] p-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Some slides were skipped</p>
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
              <button type="button" onClick={onClose} className="mt-1 text-accent hover:underline text-[11px]">
                Close and review →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="shrink-0 px-6 py-4 border-t border-line-soft flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-line-soft text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary hover:border-text-dim"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => submit('append')}
            disabled={loading || pdfState === 'extracting'}
            className="px-4 py-2 rounded-full border border-line-soft text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Append'}
          </button>
          <button
            type="button"
            onClick={() => submit('replace')}
            disabled={loading || pdfState === 'extracting'}
            className="btn-primary px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Generate lesson'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
