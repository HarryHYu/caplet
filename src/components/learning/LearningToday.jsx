import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BoltIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function LearningToday({ actions = [], source = 'today', className = '', trackingEnabled = true }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const queue = Array.isArray(actions) ? actions : [];
  const action = queue[selectedIndex] || queue[0];

  useEffect(() => { setSelectedIndex(0); }, [actions]);

  useEffect(() => {
    if (!trackingEnabled || !action) return;
    api.logEvent?.({
      type: 'learning_action_viewed',
      idempotencyKey: `learning-today-viewed:${source}:${action.id}:${new Date().toISOString().slice(0, 10)}`,
      feature: `learning_today:${source}`,
      entityType: 'learning_action',
      entityId: action.id,
      metadata: { source, actionType: action.type, position: action.position },
    });
  }, [action, source, trackingEnabled]);

  if (!action) return null;

  const chooseAnother = () => setSelectedIndex((current) => (current + 1) % queue.length);
  return (
    <section aria-labelledby={`learning-today-${source}`} className={`overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] ${className}`}>
      <div className="p-7 md:p-9">
        <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><BoltIcon className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Caplet Today · {action.eyebrow}</p>
              <h2 id={`learning-today-${source}`} className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">{action.title}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{action.detail}</p>
              {action.estimatedMinutes && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white/70"><ClockIcon className="h-4 w-4" />About {action.estimatedMinutes} minutes</p>}
            </div>
          </div>
          <Link
            to={action.href}
            onClick={() => trackingEnabled && api.logEvent?.({ type: 'next_action_started', idempotencyKey: `learning-today-started:${source}:${action.id}:${Date.now()}`, feature: `learning_today:${source}`, entityType: 'learning_action', entityId: action.id, metadata: { source, actionType: action.type, position: action.position } })}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-accent"
          >
            Start next <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {queue.length > 1 && (
        <div className="flex flex-col gap-3 border-t border-white/15 bg-black/10 px-7 py-4 sm:flex-row sm:items-center sm:justify-between md:px-9">
          <p className="text-xs font-bold text-white/65">{queue.length - 1} more useful {queue.length - 1 === 1 ? 'step' : 'steps'} waiting</p>
          <button type="button" onClick={chooseAnother} className="min-h-11 self-start rounded-xl px-3 text-sm font-bold text-white hover:bg-white/10 sm:self-auto">Show me something else</button>
        </div>
      )}
    </section>
  );
}
