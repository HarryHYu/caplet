import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';

const COLORS = ['var(--text-primary)', 'var(--text-dim)', 'var(--line-soft)', 'var(--accent)', '#888', '#aaa', '#ccc'];

const SurveyResults = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useReveal();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getSurveyStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load survey statistics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-body">
        <CapletLoader message="Loading survey results…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-body">
        <div className="text-center max-w-md mx-auto px-6 reveal">
          <span className="font-hand text-accent text-lg block mb-3">Hmm, something went sideways</span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight mb-3">Unable to Load Results</h2>
          <p className="text-base font-medium text-text-muted">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto bg-surface-raised rounded-3xl p-20 text-center reveal shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <span className="font-hand text-accent text-lg block mb-3">Nothing here yet</span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight mb-6">No Responses Yet</h1>
            <p className="text-base font-medium text-text-muted">
              No survey responses have been logged in the current cycle.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ageData = Object.entries(stats.age).map(([name, value]) => ({ name, value }));
  const tracksSpendingData = Object.entries(stats.tracksSpending).map(([name, value]) => ({
    name: name === 'yes' ? 'Affirmative' : 'Negative',
    value
  }));
  const taughtAtSchoolData = Object.entries(stats.taughtAtSchool).map(([name, value]) => ({
    name: name === 'yes' ? 'Institutional' : 'Autonomous',
    value
  }));
  const termsConfusingData = Object.entries(stats.termsConfusing).map(([name, value]) => ({
    name: name === 'yes' ? 'Complex' : 'Transparent',
    value
  }));
  const helpfulExplanationsData = Object.entries(stats.helpfulExplanations).map(([name, value]) => ({
    name,
    value
  }));

  const confidenceData = [];
  for (let i = 1; i <= 10; i++) {
    confidenceData.push({
      level: i,
      name: i.toString(),
      value: stats.confidence.distribution[i] || 0
    });
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-20 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-xl block mb-3">Survey results</span>
              <h1 className="font-display text-6xl md:text-8xl mb-8 font-extrabold tracking-tight">
                Literacy <br />Spectrum
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif max-w-xl">
                A synthesis of crowd-sourced financial knowledge and perceived competency across our community.
              </p>
            </div>
            <div className="block-blue rounded-3xl px-8 py-7 text-center shrink-0 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <span className="text-sm font-semibold text-text-dim block mb-2">Total responses</span>
              <span className="font-display text-6xl font-extrabold text-accent leading-none tracking-tight">{stats.total}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 reveal mb-6">
          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display text-lg font-extrabold tracking-tight mb-10">Demographic Breakdown</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display text-lg font-extrabold tracking-tight mb-10">Tracks Their Spending</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tracksSpendingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tracksSpendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--accent)', 'var(--line-soft)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 reveal mb-6">
          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display text-lg font-extrabold tracking-tight mb-10">Learned It at School</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taughtAtSchoolData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taughtAtSchoolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--text-primary)', 'var(--line-soft)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display text-lg font-extrabold tracking-tight mb-10">Finds the Terms Confusing</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={termsConfusingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {termsConfusingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--accent)', 'var(--text-dim)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Confidence Level */}
        <div className="bg-surface-raised rounded-3xl p-12 lg:p-20 reveal mb-6 relative overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 relative z-10">
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight mb-2">Confidence Self-Assessment</h2>
              <p className="text-base font-serif text-text-dim">Distribution of perceived knowledge levels (1 to 10 scale).</p>
            </div>
            <div className="block-cream rounded-2xl px-6 py-4 text-center shrink-0">
              <span className="text-sm font-semibold text-text-muted block mb-1">Average confidence</span>
              <span className="font-display text-4xl font-extrabold text-accent tracking-tight">{stats.confidence.average}</span>
            </div>
          </div>
          <div className="h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-soft)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--text-dim)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--text-dim)' }}
                />
                <Tooltip cursor={{ fill: 'var(--surface-body)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="var(--text-primary)" barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Helpful Explanations */}
        <div className="bg-surface-raised rounded-3xl p-12 lg:p-20 reveal shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <h2 className="font-display text-lg font-extrabold tracking-tight mb-14">What Helps People Learn</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={helpfulExplanationsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line-soft)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={180}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 'black', fill: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Tooltip cursor={{ fill: 'var(--surface-raised)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="var(--accent)" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="mt-12 flex justify-between items-center text-xs font-medium text-text-dim opacity-60">
          <span>Survey cycle: 2024.A</span>
          <span>All responses anonymous</span>
        </footer>
      </div>
    </div>
  );
};

export default SurveyResults;

