import {
  ArrowRightIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function percentage(value) {
  if (value == null) return 'Not enough evidence';
  return `${Math.round((Number(value) <= 1 ? Number(value) * 100 : Number(value)))}% mastery`;
}

export function MisconceptionList({ items = [], outcomeById = new Map() }) {
  return (
    <section className="rounded-3xl bg-[color:var(--block-amber)] p-7" aria-labelledby="misconceptions-heading">
      <LightBulbIcon className="h-7 w-7 text-accent" aria-hidden="true" />
      <h2 id="misconceptions-heading" className="mt-4 text-2xl font-display font-extrabold text-text-primary">
        Common misconceptions
      </h2>
      <p className="mt-2 text-sm font-medium text-text-muted">Patterns from current, non-superseded learning evidence.</p>
      {items.length ? (
        <ol className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.code} className="rounded-2xl bg-surface-raised/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-text-primary">{item.code}</p>
                  {item.outcomeIds?.length > 0 && (
                    <p className="mt-1 text-xs font-medium text-text-muted">
                      {item.outcomeIds.map((id) => outcomeById.get(String(id))?.code).filter(Boolean).join(' · ') || 'Mapped outcome'}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                  {item.studentCount} {item.studentCount === 1 ? 'student' : 'students'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-2xl bg-surface-raised/80 p-4 text-sm font-medium text-text-muted">
          No shared misconception pattern is visible yet.
        </p>
      )}
    </section>
  );
}

export function InterventionQueue({ items = [], onSelectStudent }) {
  return (
    <section className="rounded-3xl bg-surface-raised p-7 shadow-[0_22px_50px_-38px_rgba(20,20,18,0.4)]" aria-labelledby="intervention-heading">
      <ExclamationCircleIcon className="h-7 w-7 text-accent" aria-hidden="true" />
      <h2 id="intervention-heading" className="mt-4 text-2xl font-display font-extrabold text-text-primary">
        Intervention queue
      </h2>
      <p className="mt-2 text-sm font-medium text-text-muted">Students with weak, overdue, or missing evidence appear first.</p>
      {items.length ? (
        <ul className="mt-6 divide-y divide-line-soft">
          {items.map((item) => (
            <li key={item.student.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-bold text-text-primary">{item.student.name}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.priority === 'high' ? 'bg-surface-error text-text-error' : 'bg-accent-soft text-accent'}`}>
                    {item.priority} priority
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  {percentage(item.averageProbability)} · {item.weakOutcomeCount} weak {item.weakOutcomeCount === 1 ? 'outcome' : 'outcomes'}
                </p>
              </div>
              {onSelectStudent && (
                <button type="button" onClick={() => onSelectStudent(item.student.id)} className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-strong">
                  View profile <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl bg-[color:var(--block-green)] p-4 text-sm font-bold text-text-primary">
          No students currently meet the intervention threshold.
        </p>
      )}
    </section>
  );
}

export function RemediationGroups({ groups = [], onCreateAssignment }) {
  return (
    <section className="rounded-3xl bg-[color:var(--block-blue)] p-7" aria-labelledby="groups-heading">
      <UserGroupIcon className="h-7 w-7 text-accent" aria-hidden="true" />
      <h2 id="groups-heading" className="mt-4 text-2xl font-display font-extrabold text-text-primary">
        Suggested groups
      </h2>
      <p className="mt-2 text-sm font-medium text-text-muted">Caplet groups learners who need evidence or support on the same outcome.</p>
      {groups.length ? (
        <ul className="mt-6 space-y-3">
          {groups.map((group) => (
            <li key={group.id} className="rounded-2xl bg-surface-raised p-4">
              <p className="font-mono text-xs font-bold text-accent">{group.outcome.code}</p>
              <p className="mt-1 font-display font-bold text-text-primary">{group.outcome.title}</p>
              <p className="mt-1 text-xs font-medium text-text-muted">
                {group.studentCount} {group.studentCount === 1 ? 'student' : 'students'} · {group.averageProbability == null ? 'Diagnostic evidence needed' : percentage(group.averageProbability)}
              </p>
              {onCreateAssignment && (
                <button type="button" onClick={() => onCreateAssignment(group)} className="btn-secondary mt-4 w-full sm:w-auto">
                  Create {group.recommendedMode === 'diagnostic' ? 'diagnostic' : 'remediation'} assignment
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm font-medium text-text-muted">No remediation groups are suggested right now.</p>
      )}
    </section>
  );
}

export function StudentProfilePanel({ profile, classroomId, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (profile) panelRef.current?.focus();
  }, [profile]);

  if (!profile) return null;
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className="rounded-3xl border border-line-soft bg-surface-raised p-7 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface-body"
      aria-labelledby="student-profile-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="section-kicker">Student profile</span>
          <h2 id="student-profile-heading" className="text-2xl font-display font-extrabold text-text-primary">{profile.student.name}</h2>
          <p className="mt-2 text-sm font-medium text-text-muted">
            {percentage(profile.averageProbability)} · {profile.evidenceCount} evidence records
          </p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="btn-secondary px-4 py-2">Close</button>}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(profile.outcomes || []).map((item) => (
          <div key={item.outcomeId} className="rounded-2xl bg-surface-soft p-4">
            <p className="font-mono text-xs font-bold text-accent">{item.outcome.code}</p>
            <p className="mt-1 text-sm font-bold text-text-primary">{item.outcome.title}</p>
            <p className="mt-2 text-xs font-medium text-text-muted">{percentage(item.probability)} · {item.evidenceCount} attempts</p>
          </div>
        ))}
      </div>
      {(profile.recentEvidence || []).length > 0 && (
        <div className="mt-8 border-t border-line-soft pt-6">
          <h3 className="text-lg font-display font-extrabold text-text-primary">Recent evidence</h3>
          <div className="mt-3 space-y-2">
            {profile.recentEvidence.map((evidence) => (
              <div key={evidence.id} className="flex flex-col gap-3 rounded-2xl bg-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">{evidence.score ?? '—'} / {evidence.maxScore ?? '—'} marks · {evidence.markingMethod}</p>
                  <p className="mt-1 text-xs font-medium text-text-muted">{evidence.assessmentType} · {new Date(evidence.occurredAt).toLocaleDateString('en-AU')}</p>
                </div>
                {classroomId && (
                  <Link
                    to={`/classes/${classroomId}/learning/students/${profile.student.id}/evidence/${evidence.id}`}
                    state={{ student: profile.student, evidence }}
                    className="btn-secondary shrink-0 px-4 py-2 text-xs"
                  >
                    Review mark
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
