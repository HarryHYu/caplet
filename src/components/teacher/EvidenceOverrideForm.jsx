import { useRef, useState } from 'react';
import { CheckBadgeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

function feedbackText(feedback) {
  if (!feedback) return '';
  if (typeof feedback === 'string') return feedback;
  return feedback.summary || feedback.overall || JSON.stringify(feedback, null, 2);
}

function makeIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `teacher-ui-${globalThis.crypto.randomUUID()}`;
  return `teacher-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function EvidenceOverrideForm({
  classroomId,
  studentId,
  evidenceId,
  evidence,
  onSaved,
}) {
  const [form, setForm] = useState({
    score: evidence?.score ?? '',
    maxScore: evidence?.maxScore ?? '',
    feedback: feedbackText(evidence?.feedback),
    misconceptionCodes: Array.isArray(evidence?.misconceptionCodes) ? evidence.misconceptionCodes.join(', ') : '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const idempotencyKey = useRef(makeIdempotencyKey());

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (form.score === '' || Number(form.score) < 0) {
      setMessage({ type: 'error', text: 'Enter a valid mark.' });
      return;
    }
    if (form.maxScore !== '' && Number(form.score) > Number(form.maxScore)) {
      setMessage({ type: 'error', text: 'The mark cannot be higher than the available marks.' });
      return;
    }
    if (form.reason.trim().length < 3) {
      setMessage({ type: 'error', text: 'Record why the mark or feedback changed.' });
      return;
    }

    const payload = {
      score: Number(form.score),
      ...(form.maxScore !== '' ? { maxScore: Number(form.maxScore) } : {}),
      feedback: form.feedback.trim(),
      misconceptionCodes: [...new Set(form.misconceptionCodes.split(',').map((code) => code.trim()).filter(Boolean))],
      reason: form.reason.trim(),
      idempotencyKey: idempotencyKey.current,
    };
    setSubmitting(true);
    try {
      const result = await api.request(
        `/teacher-learning/classes/${classroomId}/students/${studentId}/evidence/${evidenceId}/override`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      setMessage({
        type: 'success',
        text: result.masteryRefresh === 'deferred'
          ? 'The corrected evidence is saved. Mastery will refresh shortly.'
          : 'The corrected evidence and mastery profile are saved.',
      });
      onSaved?.(result);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save the teacher override.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_54px_-40px_rgba(20,20,18,0.45)] md:p-9">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Human review</span>
          <h2 className="text-3xl font-display font-extrabold text-text-primary">Correct mark and feedback</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">
            The original evidence remains immutable. Caplet saves this decision as an audited revision.
          </p>
        </div>
      </div>

      {message.text && (
        <div id="teacher-override-message" role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-6 rounded-2xl px-5 py-4 text-sm font-bold ${message.type === 'error' ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}>
          {message.type === 'success' && <CheckBadgeIcon className="mr-2 inline h-5 w-5 text-accent" aria-hidden="true" />}
          {message.text}
        </div>
      )}

      {evidence?.question?.prompt && (
        <div className="mt-7 rounded-2xl bg-surface-soft p-5">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-text-dim">Question</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary">{evidence.question.prompt}</p>
        </div>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label htmlFor="teacher-override-score" className="text-sm font-bold text-text-muted">
          Correct mark
          <input id="teacher-override-score" required type="number" min="0" step="0.5" value={form.score} onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))} aria-invalid={message.type === 'error' && message.text.includes('valid mark')} aria-describedby={message.type === 'error' ? 'teacher-override-message' : undefined} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" />
        </label>
        <label htmlFor="teacher-override-max-score" className="text-sm font-bold text-text-muted">
          Available marks <span className="font-medium text-text-dim">(uses original if blank)</span>
          <input id="teacher-override-max-score" type="number" min="0.5" step="0.5" value={form.maxScore} onChange={(event) => setForm((current) => ({ ...current, maxScore: event.target.value }))} aria-invalid={message.type === 'error' && message.text.includes('available marks')} aria-describedby={message.type === 'error' ? 'teacher-override-message' : undefined} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" />
        </label>
      </div>
      <label htmlFor="teacher-override-feedback" className="mt-6 block text-sm font-bold text-text-muted">
        Corrected feedback
        <textarea id="teacher-override-feedback" rows={6} maxLength={20000} value={form.feedback} onChange={(event) => setForm((current) => ({ ...current, feedback: event.target.value }))} className="mt-2 w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" />
      </label>
      <label htmlFor="teacher-override-misconceptions" className="mt-6 block text-sm font-bold text-text-muted">
        Misconception codes <span className="font-medium text-text-dim">(comma separated)</span>
        <input id="teacher-override-misconceptions" value={form.misconceptionCodes} onChange={(event) => setForm((current) => ({ ...current, misconceptionCodes: event.target.value }))} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 font-mono text-sm text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" />
      </label>
      <div className="mt-6">
        <label htmlFor="teacher-override-reason" className="block text-sm font-bold text-text-muted">Audit reason</label>
        <textarea id="teacher-override-reason" required minLength={3} rows={3} maxLength={2000} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} aria-invalid={message.type === 'error' && message.text.includes('Record why')} className="mt-2 w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" aria-describedby={`override-reason-help${message.type === 'error' ? ' teacher-override-message' : ''}`} />
        <span id="override-reason-help" className="mt-2 block text-xs font-medium text-text-dim">This reason is stored with your name, class, and timestamp.</span>
      </div>
      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={submitting} className="btn-primary sm:min-w-48">
          {submitting ? 'Saving revision…' : 'Save teacher override'}
        </button>
      </div>
    </form>
  );
}
