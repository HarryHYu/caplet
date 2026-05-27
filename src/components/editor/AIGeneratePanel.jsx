import { useState } from 'react';
import api from '../../services/api';

/**
 * Drawer that takes pasted notes, calls /api/ai/generate-lesson, and
 * returns the generated slides via onApply(slides, mode).
 *
 * mode = 'replace' overwrites the current draft; 'append' adds at the end.
 * The teacher always reviews + edits + saves manually — the AI never
 * writes to the DB itself.
 */
export default function AIGeneratePanel({ open, onClose, lessonTitle, onApply }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  if (!open) return null;

  const submit = async (mode) => {
    setError('');
    setWarnings([]);
    if (notes.trim().length < 30) {
      setError('Paste at least a paragraph (30+ characters) of notes.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.aiGenerateLesson({ notes, title: lessonTitle });
      onApply(res.slides || [], mode);
      setWarnings(res.warnings || []);
      if (!res.warnings?.length) onClose();
    } catch (e) {
      setError(e.message || 'AI generation failed');
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
      <aside className="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-surface-raised border-l border-line-soft shadow-2xl flex flex-col">
        <header className="shrink-0 px-6 pt-6 pb-4 border-b border-line-soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1.5">AI assist</p>
          <h2 className="text-xl font-serif italic text-text-primary">Notes → lesson</h2>
          <p className="mt-1 text-sm text-text-muted">
            Paste your raw notes (lecture transcript, dot points, textbook
            paragraphs). The AI drafts text + practice slides into the editor,
            ready for you to tweak and save.
          </p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-1.5">
              Notes
            </span>
            <textarea
              rows={14}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your lesson notes here…"
              className="w-full rounded-lg border border-line-soft bg-surface-body px-3 py-2 text-sm text-text-primary font-mono focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <span className="block mt-1 text-[11px] text-text-dim">
              {notes.length.toLocaleString()} / 12,000 characters
            </span>
          </label>

          <div className="rounded-xl border border-line-soft bg-surface-soft p-4 text-xs text-text-muted leading-relaxed">
            <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-text-dim mb-1.5">
              What the AI generates
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Text slides for explanations + intro/outro dividers</li>
              <li>Multiple choice, true/false, fill-blank, match, order, flashcards</li>
              <li>Tables when the notes contain comparisons</li>
            </ul>
            <p className="mt-2">
              <span className="font-bold">It never invents image or video URLs.</span> Add
              media manually after generation.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/[0.06] p-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Heads up</p>
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
        </div>

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
            disabled={loading}
            className="px-4 py-2 rounded-full border border-line-soft text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Append to lesson'}
          </button>
          <button
            type="button"
            onClick={() => submit('replace')}
            disabled={loading}
            className="btn-primary px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Replace lesson'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
