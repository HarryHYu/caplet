import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
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

function promptBlocks(prompt) {
  return String(prompt || '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
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
    <section className="mt-6 rounded-3xl border border-line-soft bg-surface-raised p-5 shadow-card sm:p-8 lg:p-10" aria-live="polite" aria-labelledby="practice-feedback-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isCorrect ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-text-warning'}`}>
            {isCorrect ? <CheckCircleIcon className="h-6 w-6" aria-hidden="true" /> : <LightBulbIcon className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">Feedback</p>
            <h2 id="practice-feedback-heading" className="mt-1 text-2xl font-display font-extrabold leading-tight text-text-primary sm:text-3xl">{summary}</h2>
          </div>
        </div>
        {result?.score != null && (
          <span className="w-fit rounded-full bg-accent-soft px-3 py-1.5 font-mono text-xs font-bold text-accent">
            {result.score}{maxScore != null ? ` / ${maxScore}` : ''} marks
          </span>
        )}
      </div>

      {question?.prompt && (
        <div className="mt-7 rounded-3xl bg-surface-soft p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-text-dim">Question you were working on</p>
          <p className="mt-3 whitespace-pre-line text-base font-semibold leading-relaxed text-text-primary">{question.prompt}</p>
        </div>
      )}

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
      <div className="mt-4 rounded-3xl bg-[color:var(--block-green)] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[color:var(--mark-green)]">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Stronger response
          </div>
          <p className="mt-2 whitespace-pre-wrap text-base font-medium leading-relaxed text-text-primary">{modelAnswer}</p>
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line-soft pt-6 sm:flex-row sm:justify-end">
        <button type="button" onClick={onRetry} disabled={completing} className="btn-secondary min-h-14 w-full sm:w-auto">
          Try this again
        </button>
        <button type="button" onClick={onNext} disabled={completing} className="btn-primary min-h-14 w-full px-7 text-base sm:w-auto">
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
      <p className="mt-2 text-base font-semibold leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}

export default function PracticeQuestion({ question, submitting, onSubmit, initialAnswer = '', initialElapsedSeconds = 0, onAnswerChange }) {
  const kind = responseKind(question?.responseType || question?.type);
  const options = useMemo(() => (question?.options || []).map(optionParts), [question?.options]);
  const prompt = question?.prompt || question?.question || 'Question unavailable';
  const promptParts = useMemo(() => promptBlocks(prompt), [prompt]);
  const [answer, setAnswer] = useState(initialAnswer);
  const startedAt = useRef(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    setAnswer(initialAnswer);
    startedAt.current = Date.now() - (Math.max(0, Number(initialElapsedSeconds || 0)) * 1000);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(focusTimer);
  }, [initialAnswer, initialElapsedSeconds, question?.id]);

  const updateAnswer = (value) => {
    setAnswer(value);
    onAnswerChange?.(value, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
  };

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
  const commandVerb = String(question?.commandVerb || '').trim();
  const usefulCommandVerb = commandVerb && !['a', 'an', 'the', 'how', 'what', 'which', 'why'].includes(commandVerb.toLowerCase());
  const answerHint = kind === 'multiple-choice'
    ? 'Select the answer that best fits the question.'
    : kind === 'numeric'
      ? 'Use the format you would write in your working.'
      : 'Your draft autosaves while you work.';

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line-soft bg-surface-raised p-5 shadow-card sm:p-8 lg:p-10 xl:p-12">
      <div className="flex flex-wrap items-center gap-2.5">
        {outcome && <span className="rounded-full bg-accent-soft px-3.5 py-2 font-mono text-xs font-bold text-accent">{outcomeLabel(outcome)}</span>}
        {question?.difficulty && <span className="rounded-full bg-surface-soft px-3.5 py-2 text-xs font-bold capitalize text-text-muted">{question.difficulty}</span>}
        {question?.marks != null && <span className="rounded-full bg-surface-soft px-3.5 py-2 text-xs font-bold text-text-muted">{question.marks} {Number(question.marks) === 1 ? 'mark' : 'marks'}</span>}
        {question?.expectedMinutes != null && <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-3.5 py-2 text-xs font-bold text-text-muted"><ClockIcon className="h-4 w-4" aria-hidden="true" /> {question.expectedMinutes} min</span>}
        {usefulCommandVerb && <span className="rounded-full bg-[color:var(--block-blue)] px-3.5 py-2 text-xs font-bold capitalize text-accent">Task: {commandVerb}</span>}
      </div>

      <div className="mt-8">
        {promptParts.length > 1 ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-surface-soft p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-text-dim">Read the material</p>
              <div className="mt-3 space-y-4 whitespace-pre-line text-base font-medium leading-[1.75] text-text-primary sm:text-lg">
                {promptParts.slice(0, -1).map((part, index) => <p key={`${part.slice(0, 20)}-${index}`}>{part}</p>)}
              </div>
            </div>
            <h1 className="text-3xl font-display font-extrabold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
              {promptParts.at(-1)}
            </h1>
          </div>
        ) : (
          <h1 className="max-w-5xl text-3xl font-display font-extrabold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
            {promptParts[0] || prompt}
          </h1>
        )}
      </div>

      <div className="mt-9">
        {kind === 'multiple-choice' ? (
          <fieldset>
            <legend className="mb-4 text-base font-bold text-text-muted">Choose one answer</legend>
            <div className="space-y-3.5">
              {options.map((option, index) => (
                <label key={option.key} className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-transparent p-4 transition-colors sm:min-h-[4.5rem] sm:p-5 focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface-raised ${answer === option.value ? 'border-accent/30 bg-accent-soft' : 'bg-surface-soft hover:bg-accent-soft'}`}>
                  <input
                    ref={index === 0 ? inputRef : undefined}
                    type="radio"
                    name={questionId}
                    value={option.value}
                    checked={answer === option.value}
                    onChange={(event) => updateAnswer(event.target.value)}
                    className="h-5 w-5 shrink-0 accent-[color:var(--accent)]"
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-raised font-mono text-xs font-bold text-accent" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <span className="text-base font-semibold leading-relaxed text-text-primary sm:text-lg">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : kind === 'numeric' ? (
          <div>
            <label htmlFor={questionId} className="mb-3 block text-base font-bold text-text-muted">Your answer</label>
            <input
              ref={inputRef}
              id={questionId}
              type="number"
              inputMode="decimal"
              value={answer}
              onChange={(event) => updateAnswer(event.target.value)}
              className="min-h-16 w-full max-w-2xl rounded-2xl border border-line-soft bg-surface-soft px-5 py-4 font-mono text-xl text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </div>
        ) : (
          <div>
            <label htmlFor={questionId} className="mb-3 block text-base font-bold text-text-muted">
              {kind === 'extended-response' ? 'Write your response' : 'Your answer'}
            </label>
            <textarea
              ref={inputRef}
              id={questionId}
              rows={kind === 'extended-response' ? 14 : 8}
              value={answer}
              onChange={(event) => updateAnswer(event.target.value)}
              onKeyDown={handleKeyboardSubmit}
              placeholder={kind === 'extended-response' ? 'Build your response with clear economic reasoning and relevant evidence…' : 'Explain your thinking…'}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-5 py-4 text-base font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft sm:min-h-[300px] sm:text-lg"
            />
            <p className="mt-3 text-sm font-medium text-text-dim">Press Ctrl + Enter or ⌘ + Enter to submit.</p>
          </div>
        )}
      </div>

      {!options.length && kind === 'multiple-choice' && (
        <p role="alert" className="mt-4 rounded-2xl bg-surface-error px-4 py-3 text-sm font-bold text-text-error">This question has no answer options. Move on or try again later.</p>
      )}

      <div className="mt-8 flex flex-col gap-4 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-relaxed text-text-dim">{answerHint}</p>
        <button type="submit" disabled={submitting || !String(answer).trim() || (kind === 'multiple-choice' && !options.length)} className="btn-primary min-h-14 w-full min-w-48 px-7 text-base sm:w-auto">
          {submitting ? 'Checking…' : 'Check answer'} {!submitting && <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
