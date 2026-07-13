import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';

/* ── tiny helpers ─────────────────────────────────────────────────────────── */

function fmtMinutes(mins) {
  if (!mins) return '0 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  if (typeof n === 'string') return n;
  return Number(n).toLocaleString();
}

function fmtRate(value) {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toFixed(1)}%`;
}

function fmtDay(date) {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(parsed);
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── stat block (editorial grid cell) ────────────────────────────────────── */

function StatCell({ label, value, sub, accent }) {
  return (
    <div className={`p-10 group rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform ${accent ? 'bg-accent text-white' : 'bg-surface-raised'}`}>
      <p className={`text-sm font-medium mb-8 ${accent ? 'text-white/80' : 'text-text-dim group-hover:text-accent transition-colors'}`}>
        {label}
      </p>
      <p className={`text-5xl font-display font-extrabold tracking-tight ${accent ? 'text-white' : 'text-text-primary'}`}>
        {value}
      </p>
      {sub && <p className={`mt-4 text-xs font-medium ${accent ? 'text-white/70' : 'text-text-dim'}`}>{sub}</p>}
    </div>
  );
}

/* ── inline bar (replaces pie for role breakdown) ────────────────────────── */

function InlineBar({ label, value, total, barClass = 'bg-accent' }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-text-muted">{label}</span>
        <span className="text-sm font-bold text-text-primary">{fmtNum(value)} <span className="text-text-dim font-normal">({pct}%)</span></span>
      </div>
      <div
        className="h-1 bg-surface-soft overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`${label}: ${pct}%`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={pct}
      >
        <div className={`h-full transition-all duration-1000 ease-out rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LearningKpi({ label, value, detail }) {
  return (
    <div className="rounded-2xl bg-surface-soft p-6">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">{label}</dt>
      <dd className="mt-3 text-3xl font-display font-extrabold tracking-tight text-text-primary">{value}</dd>
      {detail && <p className="mt-2 text-xs font-medium text-text-muted">{detail}</p>}
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function Metrics() {
  useReveal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    try {
      const res = await api.getMetrics();
      setData(res);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-body">
      <CapletLoader message="Loading metrics..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-body">
      <p className="text-text-muted font-mono text-sm">{error}</p>
    </div>
  );

  if (!data) return null;

  const totalUsers = data.users?.total ?? 0;
  const topCourses = data.topCourses || [];
  const learning = data.learning;
  const learningFunnel = learning?.funnel || {};
  const learningMastery = learning?.mastery || {};
  const practiceSessions = learning?.practiceSessions;
  const dailyTrend = learning?.dailyTrend || [];
  const learningWindow = Number(learning?.windowDays) || 30;
  const trendDays = Number(learning?.trendDays) || dailyTrend.length;

  const completionRate = data.progress?.uniqueUsersWithProgress
    ? Math.round((data.progress.uniqueUsersCompleted / data.progress.uniqueUsersWithProgress) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-surface-body text-text-primary py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">

        {/* ── header ── */}
        <header className="reveal mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="font-hand text-accent text-lg">Platform analytics</span>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">
              Caplet<br />
              <span className="text-accent">Metrics.</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text-dim">Auto-refreshes every 60s</p>
            {lastRefresh && (
              <p className="text-sm font-medium text-text-dim mt-1">
                Updated {timeAgo(lastRefresh)}
              </p>
            )}
            <button
              type="button"
              onClick={load}
              className="btn-secondary mt-4 hover:-translate-y-0.5 transition-transform"
            >
              Refresh now
            </button>
            <Link to="/operations" className="btn-secondary mt-3 ml-3">Operations</Link>
          </div>
        </header>

        {/* ── tier 1: hero numbers ── */}
        <section className="reveal mb-24">
          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCell label="Total Users" value={fmtNum(totalUsers)} sub={`+${data.users?.newThisWeek ?? 0} this week`} accent />
            <StatCell label="Lessons Completed" value={fmtNum(data.progress?.lessonsCompleted)} sub={`${data.progress?.lessonsCompletedThisWeek ?? 0} in the last 7 days`} />
            <StatCell label="Published Courses" value={fmtNum(data.content?.courses?.published)} sub={`${data.content?.courses?.total ?? 0} total incl. drafts`} />
            <StatCell label="Slides Created" value={fmtNum(data.content?.totalSlides)} sub={`across ${data.content?.lessons?.total ?? 0} lessons`} />
          </div>
        </section>

        {/* ── tier 2: secondary numbers ── */}
        <section className="reveal mb-24">
          <h2 className="text-2xl font-display font-bold tracking-tight text-text-primary">Breakdown</h2>
          <div className="reveal-stagger mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'New this month', value: fmtNum(data.users?.newThisMonth) },
              { label: 'Modules', value: fmtNum(data.content?.modules) },
              { label: 'In Progress', value: fmtNum(data.progress?.inProgress) },
              { label: 'Saved Slides', value: fmtNum(data.engagement?.savedSlides) },
              { label: 'Classes', value: fmtNum(data.classes?.total) },
              { label: 'Class Members', value: fmtNum(data.classes?.totalMembers) },
              { label: 'Assignments', value: fmtNum(data.assignments?.total) },
              { label: 'Assignments Done', value: fmtNum(data.assignments?.completions) },
              { label: 'Chat Messages', value: fmtNum(data.engagement?.chatMessages) },
              { label: 'Time Spent', value: fmtMinutes(data.progress?.totalMinutesSpent) },
              { label: 'Survey Responses', value: fmtNum(data.survey?.totalResponses) },
              { label: 'Avg Confidence', value: data.survey?.averageConfidence > 0 ? `${data.survey.averageConfidence}/10` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-raised p-6 rounded-2xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform group">
                <p className="text-xs font-medium text-text-dim mb-4 group-hover:text-accent transition-colors">{label}</p>
                <p className="text-2xl font-display font-extrabold tracking-tight text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── learning impact ── */}
        {learning && (
          <section className="reveal mb-24" aria-labelledby="learning-impact-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="learning-impact-heading" className="text-2xl font-display font-bold tracking-tight text-text-primary">
                  Learning impact
                </h2>
                <p className="mt-2 text-sm text-text-dim">
                  Consented learning activity over the last {learningWindow} days. Journey rates count completion only after the same learner started.
                </p>
              </div>
              <span className="w-fit rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">
                {learningWindow}-day window
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <LearningKpi
                label="Practice completion"
                value={fmtRate(learning?.measurement?.practice?.rate ?? practiceSessions?.completionRate ?? 0)}
                detail={`${fmtNum(learning?.measurement?.practice?.completedAfterStart ?? practiceSessions?.completed ?? 0)} ordered completions`}
              />
              <LearningKpi
                label="Recommendation acceptance"
                value={fmtRate(learning?.measurement?.recommendations?.rate ?? 0)}
                detail={`${fmtNum(learning?.measurement?.recommendations?.completedAfterStart ?? 0)} accepted after display`}
              />
              <LearningKpi
                label="Mastered states"
                value={fmtNum(learningMastery.masteredStates ?? 0)}
                detail={`${fmtNum(learningMastery.totalStates ?? 0)} mastery states assessed`}
              />
              <LearningKpi
                label="Weekly retention"
                value={fmtRate(learning?.measurement?.weeklyRetention?.retentionRate ?? 0)}
                detail={`${fmtNum(learning?.measurement?.weeklyRetention?.retainedLearners ?? 0)} returned from the prior week`}
              />
            </dl>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className="rounded-3xl bg-surface-raised p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                <h3 className="text-xl font-display font-bold tracking-tight text-text-primary">Practice journey</h3>
                <p className="mt-2 text-sm text-text-dim">Reach across diagnostics, questions and completed practice.</p>
                <dl className="mt-5">
                  {[
                    ['Started practice', learningFunnel.practiceStartedLearners],
                    ['Completed practice', learningFunnel.practiceCompletedLearners],
                    ['Started a lesson', learningFunnel.lessonStartedLearners],
                    ['Completed a lesson', learningFunnel.lessonCompletedLearners],
                    ['Completed a diagnostic', learningFunnel.diagnosticCompletedLearners],
                    ['Attempted a question', learningFunnel.questionAttemptLearners],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-line-soft py-4 last:border-0">
                      <dt className="text-sm font-medium text-text-muted">{label}</dt>
                      <dd className="font-mono text-sm font-bold text-text-primary">{fmtNum(value ?? 0)}</dd>
                    </div>
                  ))}
                </dl>
                {practiceSessions && (
                  <div className="mt-5 rounded-2xl bg-surface-soft p-5">
                    <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Opted-in session quality</h4>
                    <p className="mt-3 text-sm font-medium text-text-primary">
                      {fmtNum(practiceSessions.completed ?? 0)} of {fmtNum(practiceSessions.started ?? 0)} sessions completed
                      <span className="ml-2 font-mono font-bold text-accent">({fmtRate(practiceSessions.completionRate)})</span>
                    </p>
                  </div>
                )}
              </article>

              <article className="rounded-3xl bg-surface-raised p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                <h3 className="text-xl font-display font-bold tracking-tight text-text-primary">Recommendations and mastery</h3>
                <p className="mt-2 text-sm text-text-dim">Whether suggested next steps are used, and where learners currently sit.</p>
                <dl className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-surface-soft p-5">
                    <dt className="text-xs font-medium text-text-dim">Recommendations shown</dt>
                    <dd className="mt-2 text-2xl font-display font-extrabold text-text-primary">{fmtNum(learningFunnel.recommendationDisplayedLearners ?? 0)}</dd>
                  </div>
                  <div className="rounded-2xl bg-surface-soft p-5">
                    <dt className="text-xs font-medium text-text-dim">Recommendations used</dt>
                    <dd className="mt-2 text-2xl font-display font-extrabold text-text-primary">{fmtNum(learningFunnel.recommendationAcceptedLearners ?? 0)}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <InlineBar label="Mastered" value={learningMastery.masteredStates ?? 0} total={learningMastery.totalStates ?? 0} />
                  <InlineBar label="Developing" value={learningMastery.developingStates ?? 0} total={learningMastery.totalStates ?? 0} barClass="bg-text-primary" />
                  <InlineBar label="Needs support" value={learningMastery.needsSupportStates ?? 0} total={learningMastery.totalStates ?? 0} barClass="bg-text-muted" />
                </div>
              </article>
            </div>

            {dailyTrend.length > 0 && (
              <article className="mt-6 rounded-3xl bg-surface-raised p-6 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] sm:p-10">
                <h3 className="text-xl font-display font-bold tracking-tight text-text-primary">Daily learner activity</h3>
                <p className="mt-2 text-sm text-text-dim">Daily unique opted-in learners; counts can overlap across activities.</p>
                <div
                  className="mt-8 h-80 w-full"
                  role="img"
                  aria-label={`Daily learner activity trend over the last ${trendDays} days. Exact values are available in the table below.`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        labelFormatter={fmtDay}
                        contentStyle={{
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--line-soft)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                      <Line type="monotone" dataKey="practiceStartedLearners" name="Practice started" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="practiceCompletedLearners" name="Practice completed" stroke="var(--text-primary)" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="questionAttemptLearners" name="Question attempts" stroke="var(--text-muted)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="recommendationAcceptedLearners" name="Recommendations used" stroke="var(--accent-strong)" strokeWidth={2} strokeDasharray="2 4" dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <details className="mt-8 border-t border-line-soft pt-6">
                  <summary className="cursor-pointer text-sm font-bold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface-raised">
                    View daily values
                  </summary>
                  <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-line-soft">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <caption className="sr-only">Daily unique learner activity for the last {trendDays} days</caption>
                      <thead className="sticky top-0 bg-surface-soft text-xs text-text-dim">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-bold">Date</th>
                          <th scope="col" className="px-4 py-3 font-bold">Practice started</th>
                          <th scope="col" className="px-4 py-3 font-bold">Practice completed</th>
                          <th scope="col" className="px-4 py-3 font-bold">Questions attempted</th>
                          <th scope="col" className="px-4 py-3 font-bold">Recommendations used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyTrend.map((day) => (
                          <tr key={day.date} className="border-t border-line-soft text-text-muted">
                            <th scope="row" className="whitespace-nowrap px-4 py-3 font-bold text-text-primary">{fmtDay(day.date)}</th>
                            <td className="px-4 py-3 font-mono">{fmtNum(day.practiceStartedLearners ?? 0)}</td>
                            <td className="px-4 py-3 font-mono">{fmtNum(day.practiceCompletedLearners ?? 0)}</td>
                            <td className="px-4 py-3 font-mono">{fmtNum(day.questionAttemptLearners ?? 0)}</td>
                            <td className="px-4 py-3 font-mono">{fmtNum(day.recommendationAcceptedLearners ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </article>
            )}
          </section>
        )}

        {/* ── tier 3: users × engagement ── */}
        <section className="reveal mb-24 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* users by role */}
          <div className="bg-surface-raised p-10 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="text-xl font-display font-bold tracking-tight text-text-primary">Users by Role</h2>
            <div className="mt-6">
              <InlineBar label="Students" value={data.users?.byRole?.student ?? 0} total={totalUsers} />
              <InlineBar label="Instructors" value={data.users?.byRole?.instructor ?? 0} total={totalUsers} barClass="bg-text-primary" />
              <InlineBar label="Admins" value={data.users?.byRole?.admin ?? 0} total={totalUsers} barClass="bg-text-muted" />
            </div>
          </div>

          {/* engagement reach */}
          <div className="bg-surface-raised p-10 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="text-xl font-display font-bold tracking-tight text-text-primary">Engagement Reach</h2>
            <div className="mt-6 space-y-0">
              {[
                { label: 'Users with any progress', value: data.progress?.uniqueUsersWithProgress ?? 0 },
                { label: 'Users completed ≥1 lesson', value: data.progress?.uniqueUsersCompleted ?? 0 },
                { label: 'Lesson completion rate', value: `${completionRate}%` },
                { label: 'Total progress records', value: fmtNum(data.progress?.totalRecords) },
              ].map(({ label, value }) => (
                <div key={label} className="py-5 border-b border-line-soft last:border-0 flex justify-between items-center">
                  <span className="text-xs font-medium text-text-muted">{label}</span>
                  <span className="text-lg font-display font-bold tracking-tight text-text-primary">{fmtNum(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── tier 4: top courses bar chart ── */}
        {topCourses.length > 0 && (
          <section className="reveal mb-24">
            <h2 className="text-2xl font-display font-bold tracking-tight text-text-primary">Top Courses</h2>
            <p className="text-sm text-text-dim mb-8 mt-2">Ranked by total lesson completions.</p>
            <div className="bg-surface-raised p-10 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <ResponsiveContainer width="100%" height={Math.max(180, topCourses.length * 44)}>
                <BarChart
                  data={topCourses}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" opacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="title"
                    type="category"
                    width={150}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickFormatter={(v) => (v.length > 22 ? v.slice(0, 22) + '…' : v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line-soft)',
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'var(--surface-raised)' }}
                  />
                  <Bar dataKey="completions" radius={0} maxBarSize={20}>
                    {topCourses.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'var(--text-muted)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── footer stamp ── */}
        <footer className="pt-8 text-sm font-medium text-text-dim flex justify-between">
          <span>Caplet · Internal Analytics</span>
          <span>{data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ''}</span>
        </footer>

      </div>
    </div>
  );
}
