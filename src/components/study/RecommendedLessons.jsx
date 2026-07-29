import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  BoltIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   RecommendedLessons — the ported recommendation engine's feed, in new style.

   Calls api.getRecommendations (the 1686-line algorithm on the backend), which
   ranks content-matched lessons and study actions against the learner's weakest
   syllabus points, habits, and upcoming assessments. Each card explains WHY it
   was chosen. Shown/clicked events feed back into the engine.
   ────────────────────────────────────────────────────────────────────────── */

const DIFF_WIDTH = { easy: '34%', mixed: '67%', medium: '67%', hard: '100%' };

// Where a recommendation card should take the learner.
function targetFor(rec) {
  const a = rec.action || {};
  const lesson = (Array.isArray(rec.lessons) && rec.lessons[0]) || null;
  const courseId = lesson?.courseId || a.courseId;
  const lessonId = lesson?.lessonId || a.lessonId;
  if (courseId) return `/courses/${courseId}${lessonId ? `?lesson=${lessonId}` : ''}`;
  const params = new URLSearchParams({
    subject: String(a.subject || rec.subtitle || 'economics').toLowerCase().split(' ')[0],
    mode: 'diagnostic',
  });
  return `/practice?${params.toString()}`;
}

function urgencyRing(urgency) {
  if (urgency === 'high') return 'border-red-400/40';
  if (urgency === 'medium') return 'border-accent/40';
  return 'border-line-soft';
}

function RecCard({ rec, index }) {
  const to = targetFor(rec);
  const matched = Array.isArray(rec.lessons) ? rec.lessons.slice(0, 2) : [];
  return (
    <Link
      to={to}
      onClick={() => api.logRecEvents([{ recId: rec.id, recType: rec.type, action: 'clicked', subject: rec.action?.subject }])}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      className={`group flex w-[19rem] shrink-0 snap-start flex-col justify-between rounded-3xl border ${urgencyRing(rec.urgency)} bg-surface-raised p-6 shadow-[0_22px_44px_-30px_rgba(20,20,18,0.35)] transition-transform duration-200 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent">{rec.subtitle}</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-text-dim">
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />{rec.estimatedMins}m
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-extrabold leading-tight tracking-tight text-text-primary group-hover:text-accent">
          {rec.title}
        </h3>

        {/* difficulty bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-accent/60" style={{ width: DIFF_WIDTH[rec.difficulty] || '50%' }} />
          </div>
          <span className="text-[10px] font-bold capitalize text-text-dim">{rec.difficulty}</span>
        </div>

        {/* why the engine picked this */}
        <p className="mt-3 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-text-muted">
          <BoltIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" aria-hidden="true" />
          <span className="line-clamp-3">{rec.reason}</span>
        </p>

        {/* content-matched lessons */}
        {matched.length > 0 && (
          <ul className="mt-3 space-y-1">
            {matched.map((l) => (
              <li key={l.lessonId || l.title} className="flex items-center gap-1.5 text-[11px] font-bold text-text-dim">
                <BookOpenIcon className="h-3 w-3 shrink-0 text-accent/60" aria-hidden="true" />
                <span className="truncate">{l.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-accent">
        {rec.action?.type === 'practice' ? 'Practise this' : 'Start lesson'}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function RecommendedLessons() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const loggedShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.getRecommendations(8).then((res) => {
      if (cancelled) return;
      const list = res?.recommendations || [];
      setRecs(list);
      setLoading(false);
      if (!loggedShown.current && list.length) {
        loggedShown.current = true;
        api.logRecEvents(list.map((r) => ({ recId: r.id, recType: r.type, action: 'shown', subject: r.action?.subject })));
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="reveal mb-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <span className="font-hand text-lg text-blue -rotate-2 inline-block">picked for you</span>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
            <SparklesIcon className="h-6 w-6 text-accent" aria-hidden="true" /> Recommended lessons
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-52 w-[19rem] shrink-0 animate-pulse rounded-3xl bg-surface-soft" />)}
        </div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line-soft bg-surface-raised p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <SparklesIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight text-text-primary">No recommendations yet</p>
            <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-text-muted">
              Try a little practice or open a lesson, and the coach will start matching lessons to your weakest syllabus points right here.
            </p>
          </div>
          <Link to="/practice" className="btn-primary">
            Start practising <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-4 [scrollbar-color:var(--accent-soft)_transparent] [scrollbar-width:thin]">
          <div className="flex min-w-max snap-x snap-mandatory gap-4">
            {recs.map((rec, i) => <RecCard key={rec.id} rec={rec} index={i} />)}
          </div>
        </div>
      )}
    </section>
  );
}
