import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { actionDetails } from './learningNextActionUtils';

export default function LearningNextAction({ resume, studyTask, recommendation, fallbackHref, fallbackTitle, source = 'learning', className = '', trackingEnabled = true }) {
  const action = actionDetails({ resume, studyTask, recommendation, fallbackHref, fallbackTitle, source });

  useEffect(() => {
    if (!trackingEnabled) return;
    api.logEvent?.({
      type: 'learning_action_viewed',
      idempotencyKey: `learning-action-viewed:${source}:${action.type}:${new Date().toISOString().slice(0, 10)}`,
      feature: `learning_loop:${source}`,
      entityType: 'learning_action',
      entityId: action.type,
      metadata: { source, actionType: action.type, mode: action.mode || '' },
    });
  }, [action.mode, action.type, source, trackingEnabled]);

  return (
    <Link
      to={action.href}
      onClick={() => trackingEnabled && api.logEvent?.({
        type: 'next_action_started',
        idempotencyKey: `next-action-started:${source}:${action.type}:${Date.now()}`,
        feature: `learning_loop:${source}`,
        entityType: 'learning_action',
        entityId: action.type,
        metadata: { source, actionType: action.type, mode: action.mode || '' },
      })}
      className={`group flex flex-col gap-6 rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 md:flex-row md:items-center md:justify-between md:p-9 ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><SparklesIcon className="h-6 w-6" aria-hidden="true" /></span>
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">{action.eyebrow}</p><h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">{action.title}</h2><p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{action.detail}</p></div>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-accent">Start now <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
    </Link>
  );
}
