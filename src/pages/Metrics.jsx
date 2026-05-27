import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

const COLORS = ['#0050FF', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6'];

const StatCard = ({ label, value, sub, icon, accent }) => (
  <div
    className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
      accent
        ? 'border-accent bg-accent/5 dark:bg-accent/10'
        : 'border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim dark:text-text-dim mb-1">
          {label}
        </p>
        <p
          className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
            accent ? 'text-accent' : 'text-text-primary dark:text-text-primary'
          }`}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs font-medium text-text-dim dark:text-text-dim mt-2">{sub}</p>
        )}
      </div>
      {icon && (
        <div className="p-3 rounded-xl bg-surface-soft dark:bg-text-primary/50 text-text-dim">
          {icon}
        </div>
      )}
    </div>
  </div>
);

const Metrics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getMetrics();
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CapletLoader message="Loading metrics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const progressPieData = [
    { name: 'Completed', value: data.progress.lessonsCompleted || 0, color: COLORS[1] },
    { name: 'In Progress', value: data.progress.inProgress || 0, color: COLORS[0] },
    { name: 'Not Started', value: data.progress.notStarted || 0, color: COLORS[7] },
  ].filter((d) => d.value > 0);

  const usersByRoleData = Object.entries(data.users.byRole || {}).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-surface-body py-32 pb-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {/* Hero */}
        <section className="mb-16">
          <span className="section-kicker mb-4">Platform Analytics</span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary dark:text-text-primary mb-4 tracking-tighter uppercase">
            Live <br />
            <span className="text-accent">Metrics.</span>
          </h1>
          <p className="text-xl text-text-dim dark:text-text-dim max-w-2xl font-medium">
            Real-time platform statistics. Updated every 60 seconds.
          </p>
          {data.generatedAt && (
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">
              Last updated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          )}
        </section>

        {/* Key stats — big numbers */}
        <section className="mb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Users"
            value={data.users?.total ?? 0}
            sub={`+${data.users?.newThisWeek ?? 0} this week`}
            accent
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <StatCard
            label="Lessons Completed"
            value={data.progress?.lessonsCompleted ?? 0}
            sub={`${data.progress?.uniqueUsersCompleted ?? 0} users completed at least one`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Courses"
            value={data.content?.courses?.published ?? 0}
            sub={`${data.content?.courses?.total ?? 0} total`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatCard
            label="Classes"
            value={data.classes?.total ?? 0}
            sub={`${data.classes?.totalMembers ?? 0} total members`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </section>

        {/* Secondary stats grid */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-text-primary dark:text-text-primary mb-8 uppercase tracking-tight">
            Content & Engagement
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Modules</p>
              <p className="text-2xl font-extrabold text-text-primary dark:text-text-primary">{data.content?.modules ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Lessons</p>
              <p className="text-2xl font-extrabold text-text-primary dark:text-text-primary">{data.content?.lessons?.published ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">In Progress</p>
              <p className="text-2xl font-extrabold text-text-primary dark:text-text-primary">{data.progress?.inProgress ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">This Week</p>
              <p className="text-2xl font-extrabold text-accent">{data.progress?.lessonsCompletedThisWeek ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Assignments</p>
              <p className="text-2xl font-extrabold text-text-primary dark:text-text-primary">{data.assignments?.total ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Completed</p>
              <p className="text-2xl font-extrabold text-text-primary dark:text-text-primary">{data.assignments?.completions ?? 0}</p>
            </div>
          </div>
        </section>

        {/* Users breakdown */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-text-primary dark:text-text-primary mb-8 uppercase tracking-tight">
            Users
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
                By Role
              </h3>
              {usersByRoleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={usersByRoleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {usersByRoleData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-text-dim py-8 text-center">No user data</p>
              )}
            </div>
            <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
                Growth
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-line-soft dark:border-line-soft">
                  <span className="text-text-muted dark:text-text-dim">New this week</span>
                  <span className="text-xl font-extrabold text-accent">{data.users?.newThisWeek ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-line-soft dark:border-line-soft">
                  <span className="text-text-muted dark:text-text-dim">New this month</span>
                  <span className="text-xl font-extrabold text-text-primary dark:text-text-primary">{data.users?.newThisMonth ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Progress breakdown & Top courses */}
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
              Progress Distribution
            </h3>
            {progressPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={progressPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {progressPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-dim py-8 text-center">No progress data yet</p>
            )}
          </div>
          <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
              Top Courses by Completions
            </h3>
            {data.topCourses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topCourses}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.3} />
                  <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} />
                  <YAxis
                    dataKey="title"
                    type="category"
                    width={120}
                    tick={{ fill: '#71717A', fontSize: 9 }}
                    tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + '…' : v)}
                  />
                  <Tooltip />
                  <Bar dataKey="completions" fill="#0050FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-dim py-8 text-center">No completion data yet</p>
            )}
          </div>
        </section>

        {/* Survey & Misc */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
              Survey Responses
            </h3>
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-extrabold text-text-primary dark:text-text-primary">
                {data.survey?.totalResponses ?? 0}
              </span>
              <span className="text-text-dim">responses</span>
            </div>
            {data.survey?.averageConfidence > 0 && (
              <p className="mt-2 text-sm text-text-dim">
                Avg. confidence: {data.survey.averageConfidence}/10
              </p>
            )}
          </div>
          <div className="p-6 rounded-2xl border-2 border-line-soft dark:border-line-soft bg-surface-raised dark:bg-surface-body">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-dim mb-4">
              Engagement Reach
            </h3>
            <div className="space-y-2">
              <p>
                <span className="text-text-dim">Users with any progress:</span>{' '}
                <span className="font-bold text-text-primary dark:text-text-primary">
                  {data.progress?.uniqueUsersWithProgress ?? 0}
                </span>
              </p>
              <p>
                <span className="text-text-dim">Total progress records:</span>{' '}
                <span className="font-bold text-text-primary dark:text-text-primary">
                  {data.progress?.totalRecords ?? 0}
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Metrics;
