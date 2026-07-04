import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CapletLoader from '../../components/CapletLoader';
import { useReveal } from '../../lib/useReveal';

/**
 * Financial Twin — a live simulation of the user's financial trajectory.
 *
 * Reads the mocked-CDR connection (consent → ingest → categorize) and renders
 * the seeded Monte Carlo projection as a fan chart of percentile RANGES.
 * Everything on this page is scenario-framed: ranges under stated
 * assumptions, never a prediction and never a recommendation.
 */

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

const formatPct = (fraction) => `${(fraction * 100).toFixed(2).replace(/\.?0+$/, '')}%`;

const PERSONAS = [
  { value: 'grad-hecs-bnpl', label: 'Graduate — salary, HELP debt, BNPL' },
  { value: 'messy-merchants', label: 'Messy merchants — ambiguous descriptions' },
  { value: 'partial-data', label: 'Partial data — one account fails' },
  { value: 'revokes-mid-session', label: 'Consent revoked mid-sync' },
];

const SERIES = [
  { key: 'hecsBalance', label: 'HELP balance' },
  { key: 'superBalance', label: 'Super' },
  { key: 'savingsBalance', label: 'Savings' },
  { key: 'netPosition', label: 'Overall position' },
];

const CATEGORY_LABELS = {
  income: 'Income',
  hecs: 'HECS/HELP payments',
  bnpl: 'Buy now, pay later',
  consumer_debt: 'Consumer debt',
  super: 'Super contributions',
  transfer: 'Transfers',
  spending: 'Spending',
  uncertain: 'Uncertain',
};

const inputClass =
  'px-4 py-2.5 bg-surface-body rounded-xl border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

const FinancialTwin = () => {
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [connection, setConnection] = useState(null);
  const [categorized, setCategorized] = useState(null);
  const [projection, setProjection] = useState(null);

  // Simulation controls — all just query params to the projection endpoint.
  const [persona, setPersona] = useState('grad-hecs-bnpl');
  const [seed, setSeed] = useState(1);
  const [trials, setTrials] = useState(500);
  const [years, setYears] = useState(20);
  const [activeSeries, setActiveSeries] = useState('hecsBalance');

  useReveal();

  const refreshProjection = useCallback(async (params) => {
    const { projection: p } = await api.getFinancialTwinProjection(params);
    setProjection(p);
  }, []);

  // Initial load: connection status + stored categorization + a projection.
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    Promise.all([
      api.getFinancialTwinConnection(),
      api.getFinancialTwinCategorized().catch(() => null),
      api.getFinancialTwinProjection({ seed: 1, trials: 500, years: 20 }).catch(() => null),
    ])
      .then(([conn, cat, proj]) => {
        if (!active) return;
        setConnection(conn.connection);
        if (cat && cat.connected) setCategorized(cat);
        if (proj) setProjection(proj.projection);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load your Financial Twin.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Re-run the projection when a control changes (after initial load).
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    refreshProjection({ seed, trials, years }).catch((err) => setError(err.message || 'Projection failed.'));
  }, [seed, trials, years, loading, isAuthenticated, refreshProjection]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    setNotice('');
    try {
      const result = await api.connectFinancialTwin(persona);
      setConnection(result.connection);
      if (result.partial) {
        setNotice('One of the accounts could not be read — the twin is running on the data that was available.');
      }
      const cat = await api.getFinancialTwinCategorized();
      setCategorized(cat.connected ? cat : null);
      await refreshProjection({ seed, trials, years });
    } catch (err) {
      if (err.status === 409) {
        setConnection(null);
        setCategorized(null);
        setNotice('Consent was revoked during the sync, so everything ingested was removed straight away.');
      } else {
        setError(err.message || 'Could not connect. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleRevoke = async () => {
    setError('');
    setNotice('');
    try {
      const result = await api.revokeFinancialTwin();
      setConnection(result.connection);
      setCategorized(null);
      setNotice(`Consent withdrawn. ${result.purged} stored transaction${result.purged === 1 ? '' : 's'} deleted.`);
      await refreshProjection({ seed, trials, years });
    } catch (err) {
      setError(err.message || 'Could not revoke. Please try again.');
    }
  };

  const rerollSeed = () => setSeed(Math.floor(Math.random() * 4294967295));

  const isConnected = connection && connection.status === 'active';
  const chartRows = projection
    ? projection.series[activeSeries].map((row) => ({
        year: row.year,
        outer: [row.p10, row.p90],
        inner: [row.p25, row.p75],
        median: row.p50,
      }))
    : [];

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-lg">Tools &rarr; Savings &amp; Growth</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-4 mb-8">Financial<br />Twin.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                A simulation of your finances built from your real (for now, sample) transaction data &mdash;
                projected forward as a <em>range</em> of scenarios, because nobody&rsquo;s future is a single line.
                HECS stays income-contingent and indexed; it is never treated as a credit card.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
        </header>

        {loading ? (
          <div className="py-24 flex justify-center">
            <CapletLoader message="Waking your twin…" />
          </div>
        ) : !isAuthenticated ? (
          <div className="max-w-xl block-cream rounded-3xl p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-4">Sign in to build your Financial Twin</h2>
            <p className="text-text-muted leading-relaxed mb-8">
              The twin runs on data you consent to share and the figures saved on your Caplet profile.
              Log in to get started.
            </p>
            <Link to="/login" className="btn-primary px-8 py-4 text-sm">Log in</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ---------------- Consent / connection card ---------------- */}
            <div className="block-cream rounded-3xl p-8 lg:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <h2 className="font-display font-bold tracking-tight text-2xl mb-2">Connected data</h2>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Caplet is not yet an accredited CDR recipient, so this runs on a <strong>mocked, synthetic
                    dataset</strong> shaped exactly like the real Consumer Data Right feed. You stay in control:
                    withdrawing consent deletes every stored transaction immediately.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  {!isConnected ? (
                    <>
                      <select value={persona} onChange={(e) => setPersona(e.target.value)} className={inputClass} aria-label="Sample dataset">
                        {PERSONAS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleConnect} disabled={connecting} className="btn-primary px-8 py-3 text-sm disabled:opacity-60">
                        {connecting ? 'Syncing…' : 'Connect sample data'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-extrabold uppercase tracking-wide bg-accent-soft text-accent px-3 py-1.5 rounded-full">
                        Consent active &middot; {connection.accountsSnapshot ? connection.accountsSnapshot.length : 0} accounts
                      </span>
                      <button type="button" onClick={handleRevoke} className="btn-secondary px-6 py-3 text-sm">
                        Withdraw consent &amp; delete data
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {notice && <p className="mt-5 text-sm font-semibold text-accent">{notice}</p>}
              {error && <p className="mt-5 text-sm font-semibold text-text-error">{error}</p>}
            </div>

            {/* ---------------- Trajectory fan chart ---------------- */}
            {projection && (
              <div className="bg-surface-raised rounded-3xl p-8 lg:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="font-display font-bold tracking-tight text-2xl mb-1">Simulated trajectory</h2>
                    <p className="text-xs text-text-dim">
                      {projection.trials} simulated paths &middot; scenario draw #{projection.seed} &middot; shaded bands hold the middle 80% and 50% of paths
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-xl border border-line-soft overflow-hidden">
                      {SERIES.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setActiveSeries(s.key)}
                          className={`px-4 py-2.5 text-xs font-bold transition-colors ${activeSeries === s.key ? 'bg-accent text-white' : 'bg-surface-body text-text-muted hover:text-text-primary'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartRows} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                    <CartesianGrid stroke="var(--line-soft)" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Years from now', position: 'insideBottom', offset: -2, fill: 'var(--text-dim)', fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--line-soft)', borderRadius: 0, fontSize: 12 }}
                      formatter={(value, name) => {
                        if (Array.isArray(value)) {
                          const label = name === 'outer' ? '10th–90th percentile' : '25th–75th percentile';
                          return [`${formatCurrency(value[0])} – ${formatCurrency(value[1])}`, label];
                        }
                        return [formatCurrency(value), 'Median path'];
                      }}
                      labelFormatter={(year) => `Year ${year}`}
                    />
                    <Area type="monotone" dataKey="outer" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} />
                    <Area type="monotone" dataKey="inner" stroke="none" fill="var(--accent)" fillOpacity={0.22} isAnimationActive={false} />
                    <Line type="monotone" dataKey="median" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Controls: seed / trials / horizon */}
                <div className="mt-8 flex flex-wrap items-end gap-4">
                  <div>
                    <label className="text-xs font-semibold text-text-dim mb-1.5 block" htmlFor="twin-seed">Scenario draw (seed)</label>
                    <div className="flex gap-2">
                      <input
                        id="twin-seed"
                        type="number"
                        min="0"
                        value={seed}
                        onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className={`${inputClass} w-36`}
                      />
                      <button type="button" onClick={rerollSeed} className="btn-secondary text-xs px-4">New draw</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-dim mb-1.5 block" htmlFor="twin-trials">Simulated paths</label>
                    <select id="twin-trials" value={trials} onChange={(e) => setTrials(Number(e.target.value))} className={inputClass}>
                      <option value={100}>100</option>
                      <option value={500}>500</option>
                      <option value={2000}>2,000</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-text-dim mb-1.5 block">Horizon</span>
                    <div className="flex rounded-xl border border-line-soft overflow-hidden">
                      {[10, 20].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setYears(h)}
                          className={`px-5 py-2.5 text-xs font-bold transition-colors ${years === h ? 'bg-accent text-white' : 'bg-surface-body text-text-muted hover:text-text-primary'}`}
                        >
                          {h} years
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-text-dim leading-relaxed max-w-xs ml-auto">
                    The same draw number always reproduces the same ranges, so results are checkable — not a slot machine.
                  </p>
                </div>

                <p className="mt-8 text-sm leading-relaxed text-text-primary border-t border-line-soft/60 pt-6">{projection.summary}</p>
              </div>
            )}

            {/* ---------------- Categorized data ---------------- */}
            <AnimatePresence>
              {isConnected && categorized && categorized.summary && (
                <Motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                >
                  <div className="lg:col-span-7 block-green rounded-3xl p-8 lg:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                    <h2 className="font-display font-bold tracking-tight text-2xl mb-2">What the data shows</h2>
                    <p className="text-xs text-text-dim mb-8">
                      {categorized.summary.transactionCount} transactions, categorized deterministically &mdash; no black box.
                    </p>
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {Object.entries(categorized.summary.totalsByCategory)
                        .filter(([key, total]) => total !== 0 || key === 'hecs')
                        .map(([key, total]) => (
                          <div key={key} className="rounded-2xl bg-surface-raised p-5">
                            <dt className="text-[11px] font-extrabold uppercase tracking-wide text-text-dim mb-1">{CATEGORY_LABELS[key] || key}</dt>
                            <dd className="font-display font-extrabold text-xl text-text-primary">{formatCurrency(total)}</dd>
                            {key === 'hecs' && (
                              <p className="text-[10px] text-text-dim mt-1.5 leading-relaxed">
                                Indexed once a year, repayments income-contingent &mdash; not consumer interest.
                              </p>
                            )}
                          </div>
                        ))}
                    </dl>
                    <p className="text-[11px] text-text-dim mt-6">
                      Estimated monthly: {formatCurrency(categorized.summary.monthlyIncomeEstimate)} in, {formatCurrency(categorized.summary.monthlySpendEstimate)} spent.
                    </p>
                  </div>

                  <div className="lg:col-span-5 block-amber rounded-3xl p-8 lg:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                    <h2 className="font-display font-bold tracking-tight text-2xl mb-2">Needs a human</h2>
                    <p className="text-xs text-text-dim mb-6">
                      Anything ambiguous is flagged rather than guessed, and is <strong>not counted</strong> in any total.
                    </p>
                    {categorized.uncertain.length === 0 ? (
                      <p className="text-sm text-text-muted">Nothing uncertain in this dataset. 🎉</p>
                    ) : (
                      <ul className="space-y-3">
                        {categorized.uncertain.slice(0, 8).map((row) => (
                          <li key={row.id} className="rounded-2xl bg-surface-raised p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-text-primary truncate">{row.description}</p>
                              <p className="text-[11px] text-text-dim">{formatCurrency(row.amount)}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide bg-surface-body text-text-muted px-2.5 py-1 rounded-full border border-line-soft">
                              Uncertain
                            </span>
                          </li>
                        ))}
                        {categorized.uncertain.length > 8 && (
                          <li className="text-[11px] text-text-dim">…and {categorized.uncertain.length - 8} more.</li>
                        )}
                      </ul>
                    )}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

            {/* ---------------- Assumptions provenance ---------------- */}
            {projection && (
              <div className="bg-surface-raised rounded-3xl p-8 lg:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
                <h2 className="font-display font-bold tracking-tight text-2xl mb-2">Every assumption, on the table</h2>
                <p className="text-xs text-text-dim mb-8">
                  Version {projection.assumptionsVersion}. Each figure carries the date it was true and where it came from.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line-soft text-text-dim">
                        <th className="py-3 pr-6 font-semibold">Assumption</th>
                        <th className="py-3 pr-6 font-semibold">Value</th>
                        <th className="py-3 pr-6 font-semibold">Effective</th>
                        <th className="py-3 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.assumptions.map((a) => (
                        <tr key={a.key} className="border-b border-line-soft/40">
                          <td className="py-3 pr-6 font-bold text-text-primary">{a.key}</td>
                          <td className="py-3 pr-6 font-mono text-text-primary">{formatPct(a.value)}</td>
                          <td className="py-3 pr-6 text-text-muted">{a.effectiveDate}</td>
                          <td className="py-3 text-text-muted">{a.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-text-dim leading-relaxed border-t border-line-soft/40 pt-5 mt-8">{projection.disclaimer}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialTwin;
