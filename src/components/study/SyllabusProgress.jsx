import { useState, useEffect } from 'react';
import { ChevronDownIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   SyllabusProgress — HSC syllabus-point coverage, in the new design language.

   Reads api.getSyllabusProgress(subject) (the ported syllabus_points catalogue
   + the learner's mastery rows), grouping every NSW HSC dot point by module and
   rolling up to a weighted module readiness and an overall Year-12 HSC score.
   ────────────────────────────────────────────────────────────────────────── */

const SUBJECTS = [
  'Economics',
  'Mathematics Advanced',
  'Mathematics Standard 2',
  'Mathematics Extension 1',
  'Physics',
  'Chemistry',
  'Biology',
  'Business Studies',
  'Legal Studies',
  'Modern History',
  'Geography',
];

function barColor(pct) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-accent';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-line-strong';
}

function groupByTopic(points) {
  const map = new Map();
  for (const pt of points) {
    if (!map.has(pt.topic)) map.set(pt.topic, { topic: pt.topic, inquiryQuestion: pt.inquiryQuestion, points: [] });
    map.get(pt.topic).points.push(pt);
  }
  return [...map.values()];
}

function ModuleRow({ mod }) {
  const [open, setOpen] = useState(false);
  const pct = mod.moduleReadiness;
  return (
    <div className="overflow-hidden rounded-2xl border border-line-soft bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-soft/60"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-soft font-mono text-xs font-bold text-text-muted">
          M{mod.module}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-bold text-text-primary">{mod.moduleName}</span>
            <span className="shrink-0 font-mono text-xs font-bold text-text-muted">{pct}%</span>
          </span>
          <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
            <span className={`block h-full rounded-full ${barColor(pct)} transition-all`} style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-1 block text-[11px] font-semibold text-text-dim">
            Year {mod.year} · {mod.practicedCount}/{mod.totalPoints} points attempted · {mod.masteredCount} mastered
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line-soft px-5 py-4">
          {groupByTopic(mod.points).map((t) => (
            <div key={t.topic}>
              <p className="text-xs font-extrabold uppercase tracking-wider text-text-dim">{t.topic}</p>
              <ul className="mt-2 space-y-2">
                {t.points.map((pt) => (
                  <li key={pt.id} className="flex items-start gap-3">
                    <span className="mt-1 font-mono text-[10px] font-bold text-text-dim">{pt.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-text-primary">{pt.dotPoint}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-soft">
                          <span className={`block h-full rounded-full ${barColor(pt.masteryLevel)}`} style={{ width: `${pt.masteryLevel}%` }} />
                        </span>
                        <span className="font-mono text-[10px] font-bold text-text-dim">{pt.masteryLevel}%</span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SyllabusProgress() {
  const [subject, setSubject] = useState('Economics');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getSyllabusProgress(subject)
      .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData({ modules: [], overallHscReadiness: 0 }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [subject]);

  const modules = data?.modules || [];

  return (
    <section className="reveal">
      <div className="mb-5">
        <span className="font-hand text-lg text-blue -rotate-2 inline-block">where you stand</span>
        <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
          <AcademicCapIcon className="h-6 w-6 text-accent" aria-hidden="true" /> HSC syllabus progress
        </h2>
      </div>

      {/* subject pills */}
      <div className="-mx-1 mb-6 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        <div className="flex min-w-max gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                s === subject ? 'bg-accent text-white' : 'border border-line-soft text-text-muted hover:border-accent hover:text-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* overall readiness */}
      <div className="mb-5 flex flex-wrap items-center gap-6 rounded-3xl bg-[color:var(--mark-blue)] p-6 text-white shadow-[0_28px_58px_-40px_rgba(19,81,170,0.7)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">HSC readiness (Year 12)</p>
          <p className="mt-1 font-display text-5xl font-extrabold tracking-tight">{data?.overallHscReadiness ?? 0}%</p>
        </div>
        {typeof data?.year11Readiness === 'number' && (
          <div className="border-l border-white/20 pl-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Year 11 foundation</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white/90">{data.year11Readiness}%</p>
          </div>
        )}
        <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-white/75">
          Weighted across every {subject} dot point. Mastery is earned through sustained correct practice — reading a lesson barely moves it.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-soft" />)}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-line-soft bg-surface-raised p-8 text-center">
          <p className="text-sm font-bold text-text-primary">No syllabus points loaded for {subject} yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => <ModuleRow key={`${mod.module}-${mod.year}`} mod={mod} />)}
        </div>
      )}
    </section>
  );
}
