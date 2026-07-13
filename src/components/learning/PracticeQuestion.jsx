import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

function optionParts(option, index) {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: String(option), label: String(option), key: String(option) };
  }
  return {
    value: String(option?.value ?? option?.id ?? option?.key ?? index),
    label: option?.label ?? option?.text ?? option?.value ?? `Option ${index + 1}`,
    key: String(option?.id ?? option?.key ?? option?.value ?? index),
  };
}

function responseKind(responseType) {
  const type = String(responseType || '').toLowerCase().replaceAll('_', '-');
  if (['multiple-choice', 'mcq', 'choice'].includes(type)) return 'multiple-choice';
  if (['number', 'numeric', 'calculation'].includes(type)) return 'numeric';
  if (['extended-response', 'essay', 'long-answer'].includes(type)) return 'extended-response';
  return 'short-response';
}

function outcomeLabel(outcome) {
  if (!outcome) return '';
  if (typeof outcome === 'string') return outcome;
  return [outcome.code, outcome.title].filter(Boolean).join(' · ');
}

function feedbackText(value) {
  if (Array.isArray(value)) return value.map(feedbackText).filter(Boolean).join(' ');
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.label || value?.title || value?.description || value?.message || value?.code || '';
}

export function FeedbackPanel({ result, question, onRetry, onNext, nextLabel, completing }) {
  const feedback = result?.feedback || result || {};
  const isCorrect = result?.correct ?? feedback.correct;
  const outcome = feedback.outcome || result?.outcome || question?.outcomes?.[0];
  const misconception = feedbackText(feedback.misconception || feedback.misconceptions);
  const improvement = feedbackText(feedback.improvement || feedback.nextStep);
  const modelAnswer = feedbackText(feedback.modelAnswer || feedback.strongerResponse);
  const explanation = feedbackText(feedback.explanation);
  const summary = feedbackText(feedback.summary) || (isCorrect ? 'Strong work — that evidence has been recorded.' : 'This is a useful signal. Let’s improve it.');
  const maxScore = result?.maxScore ?? question?.marks;

  return (
    <section className="mt-6 rounded-3xl bg-surface-raised p-6 shadow-[0_22px_50px_-38px_rgba(20,20,18,0.45)] md:p-8" aria-live="polite" aria-labelledby="practice-feedback-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isCorrect ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>
            {isCorrect ? <CheckCircleIcon className="h-6 w-6" aria-hidden="true" /> : <LightBulbIcon className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">Feedback</p>
            <h2 id="practice-feedback-heading" className="mt-1 text-2xl font-display font-extrabold text-text-primary">{summary}</h2>
          </div>
        </div>
        {result?.score != null && (
          <span className="w-fit rounded-full bg-accent-soft px-3 py-1.5 font-mono text-xs font-bold text-accent">
            {result.score}{maxScore != null ? ` / ${maxScore}` : ''} marks
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {outcome && (
          <FeedbackItem icon={TagIcon} label="Outcome" value={outcomeLabel(outcome)} />
        )}
        {misconception && (
          <FeedbackItem icon={ExclamationCircleIcon} label="Misconception" value={misconception} tone="amber" />
        )}
        {explanation && (
          <FeedbackItem icon={LightBulbIcon} label="Why" value={explanation} />
        )}
        {improvement && (
          <FeedbackItem icon={ArrowRightIcon} label="Improve it" value={improvement} tone="blue" />
        )}
      </div>

      {modelAnswer && (
        <div className="mt-4 rounded-2xl bg-[color:var(--block-green)] p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[color:var(--mark-green)]">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Stronger response
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-text-primary">{modelAnswer}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onRetry} disabled={completing} className="btn-secondary">
          Try this again
        </button>
        <button type="button" onClick={onNext} disabled={completing} className="btn-primary">
          {completing ? 'Saving your progress…' : nextLabel} {!completing && <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}

function FeedbackItem(props) {
  const { label, value, tone } = props;
  const Icon = props.icon;
  const toneClass = tone === 'amber'
    ? 'bg-[color:var(--block-amber)]'
    : tone === 'blue' ? 'bg-[color:var(--block-blue)]' : 'bg-surface-soft';
  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}

export default function PracticeQuestion({ question, submitting, onSubmit }) {
  const kind = responseKind(question?.responseType || question?.type);
  const options = useMemo(() => (question?.options || []).map(optionParts), [question?.options]);
  const [answer, setAnswer] = useState('');
  const startedAt = useRef(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    startedAt.current = Date.now();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [question?.id]);

  const submit = (event) => {
    event.preventDefault();
    const value = typeof answer === 'string' ? answer.trim() : answer;
    if (!value || submitting) return;
    onSubmit({
      answer: value,
      timeTakenSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
    });
  };

  const handleKeyboardSubmit = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(event);
  };

  const outcome = question?.outcomes?.[0];
  const questionId = `practice-answer-${question?.id || 'current'}`;

  return (
    <form onSubmit={submit} className="rounded-3xl bg-surface-raised p-6 shadow-[0_26px_64px_-44px_rgba(20,20,18,0.5)] md:p-9">
      <div className="flex flex-wrap items-center gap-2">
        {outcome && <span className="rounded-full bg-accent-soft px-3 py-1.5 font-mono text-[11px] font-bold text-accent">{outcomeLabel(outcome)}</span>}
        {question?.difficulty && <span className="rounded-full bg-surface-soft px-3 py-1.5 text-[11px] font-bold capitalize text-text-muted">{question.difficulty}</span>}
        {question?.marks != null && <span className="rounded-full bg-surface-soft px-3 py-1.5 text-[11px] font-bold text-text-muted">{question.marks} {Number(question.marks) === 1 ? 'mark' : 'marks'}</span>}
      </div>

      <h1 className="mt-5 text-2xl font-display font-extrabold leading-snug text-text-primary md:text-3xl">
        {question?.prompt || question?.question || 'Question unavailable'}
      </h1>

      <div className="mt-7">
        {kind === 'multiple-choice' ? (
          <fieldset>
            <legend className="mb-3 text-sm font-bold text-text-muted">Choose one answer</legend>
            <div className="space-y-3">
              {options.map((option, index) => (
                <label key={option.key} className={`flex cursor-pointer items-start gap-4 rounded-2xl p-4 transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface-raised ${answer === option.value ? 'bg-accent-soft' : 'bg-surface-soft hover:bg-accent-soft'}`}>
                  <input
                    ref={index === 0 ? inputRef : undefined}
                    type="radio"
                    name={questionId}
                    value={option.value}
                    checked={answer === option.value}
                    onChange={(event) => setAnswer(event.target.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--accent)]"
                  />
                  <span className="text-sm font-semibold leading-relaxed text-text-primary">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : kind === 'numeric' ? (
          <div>
            <label htmlFor={questionId} className="mb-2 block text-sm font-bold text-text-muted">Your answer</label>
            <input
              ref={inputRef}
              id={questionId}
              type="number"
              inputMode="decimal"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="w-full rounded-2xl border border-line-soft bg-surface-soft px-5 py-4 font-mono text-lg text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </div>
        ) : (
          <div>
            <label htmlFor={questionId} className="mb-2 block text-sm font-bold text-text-muted">
              {kind === 'extended-response' ? 'Write your response' : 'Your answer'}
            </label>
            <textarea
              ref={inputRef}
              id={questionId}
              rows={kind === 'extended-response' ? 9 : 5}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyboardSubmit}
              placeholder={kind === 'extended-response' ? 'Build your response with clear economic reasoning and relevant evidence…' : 'Explain your thinking…'}
              className="w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-5 py-4 text-base font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
            <p className="mt-2 text-xs font-medium text-text-dim">Press Ctrl + Enter or ⌘ + Enter to submit.</p>
          </div>
        )}
      </div>

      {!options.length && kind === 'multiple-choice' && (
        <p role="alert" className="mt-4 rounded-2xl bg-surface-error px-4 py-3 text-sm font-bold text-text-error">This question has no answer options. Move on or try again later.</p>
      )}

      <div className="mt-7 flex justify-end">
        <button type="submit" disabled={submitting || !String(answer).trim() || (kind === 'multiple-choice' && !options.length)} className="btn-primary min-w-40">
          {submitting ? 'Checking…' : 'Check answer'} {!submitting && <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
