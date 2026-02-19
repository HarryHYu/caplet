import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../services/api';

const COLORS = ['var(--color-text-primary)', 'var(--color-text-dim)', 'var(--color-line-soft)', 'var(--color-accent)', '#888', '#aaa', '#ccc'];

const SurveyResults = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <div className="w-12 h-12 border border-line-soft border-t-accent animate-spin mb-8" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Awaiting Data Harvest...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-body">
        <div className="text-center max-w-md mx-auto px-6 reveal-text">
          <span className="section-kicker mb-4 text-accent italic">Transmission Protocol Error</span>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="min-h-screen py-32 bg-surface-body">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto bg-surface-raised border border-line-soft p-20 text-center reveal-text">
            <span className="section-kicker mb-4">Observation Post</span>
            <h1 className="text-4xl font-black mb-8 italic uppercase tracking-tighter">Null Result.</h1>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">
              No empirical responses have been logged in the current cycle.
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

  const renderLabel = (entry) => {
    const percent = ((entry.value / stats.total) * 100).toFixed(1);
    return `${entry.name} (${percent}%)`;
  };

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Observatory &rarr; Global Matrix</span>
              <h1 className="text-6xl md:text-8xl mb-8 font-black uppercase tracking-tighter">
                Literacy <br />Spectrum.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Synthesis of crowd-sourced financial intelligence and perceived competency across global demographics.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block mb-2 italic">Total Transmissions</span>
              <span className="text-6xl font-black text-accent leading-none">{stats.total}</span>
            </div>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line-soft border border-line-soft reveal-text stagger-1 mb-px">
          <div className="bg-surface-body p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-line-soft">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-12 italic">Demographic Architecture</h2>
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
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-body p-12 lg:p-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-12 italic">Economic Discipline</h2>
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
                      <Cell key={`cell-${index}`} fill={['var(--color-accent)', 'var(--color-line-soft)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line-soft border-x border-b border-line-soft reveal-text stagger-2 mb-px">
          <div className="bg-surface-body p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-line-soft">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-12 italic">Educational Heritage</h2>
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
                      <Cell key={`cell-${index}`} fill={['var(--color-text-primary)', 'var(--color-line-soft)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-body p-12 lg:p-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-12 italic">Semantic Barrier Analysis</h2>
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
                      <Cell key={`cell-${index}`} fill={['var(--color-accent)', 'var(--color-text-dim)'][index % 2]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Confidence Level */}
        <div className="bg-surface-raised border-x border-b border-line-soft p-12 lg:p-20 reveal-text stagger-3 mb-px relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] grid-technical !bg-[size:40px_40px] pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 relative z-10">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2 italic">Competency Self-Assessment</h2>
              <p className="text-sm font-serif italic text-text-dim">Distribution of perceived knowledge levels (1-10 Scale).</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted block mb-1">Matrix Average</span>
              <span className="text-4xl font-black text-accent">{stats.confidence.average}</span>
            </div>
          </div>
          <div className="h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line-soft)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-text-dim)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-text-dim)' }}
                />
                <Tooltip cursor={{ fill: 'var(--color-surface-body)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="var(--color-text-primary)" barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Helpful Explanations */}
        <div className="bg-surface-body border-x border-b border-line-soft p-12 lg:p-20 reveal-text stagger-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 italic">Pedagogical Preference Matrix</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={helpfulExplanationsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-line-soft)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={180}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 'black', fill: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Tooltip cursor={{ fill: 'var(--color-surface-raised)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-line-soft)', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="var(--color-accent)" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="mt-20 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] text-text-dim opacity-40">
          <span>Observation Cycle: 2024.A</span>
          <span>Transmission Integrity: 100%</span>
        </footer>
      </div>
    </div>
  );
};

export default SurveyResults;

