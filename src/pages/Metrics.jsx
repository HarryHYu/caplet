import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
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
  return Number(n).toLocaleString();
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

function InlineBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-text-muted">{label}</span>
        <span className="text-sm font-bold text-text-primary">{fmtNum(value)} <span className="text-text-dim font-normal">({pct}%)</span></span>
      </div>
      <div className="h-1 bg-surface-soft overflow-hidden rounded-full">
        <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
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
  const roleData = Object.entries(data.users?.byRole || {}) // eslint-disable-line no-unused-vars
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const topCourses = (data.topCourses || []).map((c, i) => ({ ...c, fill: i === 0 ? '#0050FF' : '#3B82F6' }));

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

        {/* ── tier 3: users × engagement ── */}
        <section className="reveal mb-24 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* users by role */}
          <div className="bg-surface-raised p-10 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="text-xl font-display font-bold tracking-tight text-text-primary">Users by Role</h2>
            <div className="mt-6">
              <InlineBar label="Students" value={data.users?.byRole?.student ?? 0} total={totalUsers} color="#0050FF" />
              <InlineBar label="Instructors" value={data.users?.byRole?.instructor ?? 0} total={totalUsers} color="#10B981" />
              <InlineBar label="Admins" value={data.users?.byRole?.admin ?? 0} total={totalUsers} color="#F59E0B" />
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
                      <Cell key={i} fill={i === 0 ? '#0050FF' : '#27272A'} />
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
