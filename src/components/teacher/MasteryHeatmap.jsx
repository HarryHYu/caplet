const STATUS_LABELS = {
  secure: 'Secure',
  developing: 'Developing',
  needs_support: 'Needs support',
  no_evidence: 'No evidence',
};

const STATUS_CLASSES = {
  secure: 'bg-[color:var(--block-green)] text-text-primary',
  developing: 'bg-[color:var(--block-amber)] text-text-primary',
  needs_support: 'bg-surface-error text-text-error',
  no_evidence: 'bg-surface-soft text-text-dim',
};

function percent(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  return Math.round((numeric <= 1 ? numeric * 100 : numeric));
}

export default function MasteryHeatmap({ heatmap, onSelectStudent }) {
  const students = heatmap?.students || [];
  const outcomes = heatmap?.outcomes || [];
  const cells = heatmap?.cells || [];
  const byStudentOutcome = new Map(
    cells.map((cell) => [`${cell.studentId}:${cell.outcomeId}`, cell]),
  );

  if (!students.length || !outcomes.length) {
    return (
      <div className="rounded-3xl bg-surface-soft p-8 text-center">
        <h3 className="text-xl font-display font-extrabold text-text-primary">No mastery evidence yet.</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-text-muted">
          Students and curriculum outcomes will appear here after the class completes mapped practice.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3 text-xs font-bold text-text-muted" aria-label="Mastery status legend">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${STATUS_CLASSES[status]}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line-soft bg-surface-raised">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Mastery probability for each student and curriculum outcome
          </caption>
          <thead>
            <tr className="border-b border-line-soft bg-surface-soft">
              <th scope="col" className="sticky left-0 z-10 min-w-48 bg-surface-soft px-5 py-4 font-display font-bold text-text-primary">
                Student
              </th>
              {outcomes.map((outcome) => (
                <th key={outcome.id} scope="col" className="min-w-36 px-4 py-4 align-bottom">
                  <span className="block font-mono text-[11px] font-bold text-accent">{outcome.code || 'Outcome'}</span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-text-primary">{outcome.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-line-soft last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-surface-raised px-5 py-4">
                  {onSelectStudent ? (
                    <button
                      id={`student-profile-trigger-${student.id}`}
                      type="button"
                      onClick={() => onSelectStudent(student.id)}
                      className="text-left font-display font-bold text-text-primary underline-offset-4 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {student.name}
                    </button>
                  ) : (
                    <span className="font-display font-bold text-text-primary">{student.name}</span>
                  )}
                  {student.email && <span className="mt-1 block text-xs font-medium text-text-dim">{student.email}</span>}
                </th>
                {outcomes.map((outcome) => {
                  const cell = byStudentOutcome.get(`${student.id}:${outcome.id}`) || {
                    status: 'no_evidence', probability: null, evidenceCount: 0,
                  };
                  const probability = percent(cell.probability);
                  const label = STATUS_LABELS[cell.status] || STATUS_LABELS.no_evidence;
                  return (
                    <td key={outcome.id} className="px-3 py-3">
                      <span
                        className={`flex min-h-16 flex-col justify-center rounded-2xl px-3 py-2 ${STATUS_CLASSES[cell.status] || STATUS_CLASSES.no_evidence}`}
                        aria-label={`${student.name}, ${outcome.code || outcome.title}: ${probability == null ? 'no evidence' : `${probability}% mastery`}, ${cell.evidenceCount || 0} attempts`}
                      >
                        <span className="font-display text-lg font-extrabold">{probability == null ? '—' : `${probability}%`}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
