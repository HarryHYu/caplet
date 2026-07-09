import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CapletLoader from '../../components/CapletLoader';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'bnpl', label: 'Buy now, pay later' },
  { value: 'personal_loan', label: 'Personal loan' },
  { value: 'other', label: 'Other' },
];

const inputClass =
  'w-full px-4 py-3 bg-surface-body rounded-xl border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

const numStr = (v) => (v === null || v === undefined ? '' : String(v));
const money = (v) => (String(v).trim() === '' ? null : Number(v));

const DebtSequencer = () => {
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Form state
  const [debts, setDebts] = useState([]);
  const [hecsBalance, setHecsBalance] = useState('');
  const [repaymentIncome, setRepaymentIncome] = useState('');
  const [indexationRate, setIndexationRate] = useState('3.2');
  const [extraMonthlyAmount, setExtraMonthlyAmount] = useState('');
  const [voluntaryAnnual, setVoluntaryAnnual] = useState('');

  // Prefill from the saved financial profile so this lives inside the user's
  // account rather than starting blank each visit.
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    api
      .getFinancialProfile()
      .then(({ financialProfile: p }) => {
        if (!active || !p) return;
        setDebts(
          Array.isArray(p.debts)
            ? p.debts.filter(Boolean).map((d) => ({
                label: d.label || '',
                balance: numStr(d.balance),
                rate: numStr(d.rate),
                type: DEBT_TYPES.some((t) => t.value === d.type) ? d.type : 'other',
              }))
            : [],
        );
        setHecsBalance(numStr(p.hecsBalance));
        setRepaymentIncome(numStr(p.annualIncome));
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load your saved profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const addDebt = () => setDebts((d) => [...d, { label: '', balance: '', rate: '', type: 'credit_card' }]);
  const removeDebt = (i) => setDebts((d) => d.filter((_, idx) => idx !== i));
  const updateDebt = (i, key, value) => setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));

  useReveal();

  const handleRun = async (e) => {
    e.preventDefault();
    setRunning(true);
    setError('');
    try {
      // 1. Persist the edited BALANCES only (partial PUT). Repayment income is a
      //    calculation input, not a balance, so it is NOT written back here —
      //    that keeps this tool from mutating the annualIncome shown elsewhere in
      //    the account (Settings, course completion). It rides along as a query
      //    param in step 2 instead.
      await api.updateFinancialProfile({
        hecsBalance: money(hecsBalance),
        debts: debts
          .filter((d) => d.label.trim() || String(d.balance).trim())
          .map((d) => ({ label: d.label.trim(), balance: Number(d.balance) || 0, rate: Number(d.rate) || 0, type: d.type || 'other' })),
      });
      // 2. Recompute server-side from the saved balances + these assumptions.
      const params = {};
      if (String(repaymentIncome).trim() !== '') params.repaymentIncome = repaymentIncome;
      if (String(indexationRate).trim() !== '') params.indexationRate = indexationRate;
      if (String(extraMonthlyAmount).trim() !== '') params.extraMonthlyAmount = extraMonthlyAmount;
      if (String(voluntaryAnnual).trim() !== '') params.voluntaryAnnual = voluntaryAnnual;
      const { sequence } = await api.getDebtSequencing(params);
      setResult(sequence);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-lg">Tools &rarr; Debt &amp; Loans</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-4 mb-8">Debt<br />Sequencer.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Compare what each of your debts actually costs to carry, so you can see which one a spare
                dollar clears the most cost from &mdash; with HECS handled on its own terms, not as a credit card.
              </p>
            </div>
            <Link to="/fintools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
        </header>

        {loading ? (
          <div className="py-24 flex justify-center">
            <CapletLoader message="Loading your saved profile…" />
          </div>
        ) : !isAuthenticated ? (
          <div className="max-w-xl block-cream rounded-3xl p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-4">Sign in to use the Debt Sequencer</h2>
            <p className="text-text-muted leading-relaxed mb-8">
              This tool reads the debts saved on your Caplet profile so you don&apos;t have to re-enter them, and
              saves your changes back. Log in to get started.
            </p>
            <Link to="/login" className="btn-primary px-8 py-4 text-sm">Log in</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ---------------- Form panel ---------------- */}
            <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-8 lg:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
              <form onSubmit={handleRun} className="space-y-12">
                {/* Ordinary debts */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold tracking-tight text-2xl">Your debts</h2>
                    <button type="button" onClick={addDebt} className="btn-secondary text-xs px-5 py-2.5">+ Add debt</button>
                  </div>
                  {debts.length === 0 ? (
                    <p className="text-sm text-text-dim">No debts yet. Add a credit card, BNPL, or personal loan above.</p>
                  ) : (
                    <div className="space-y-4">
                      {debts.map((d, i) => (
                        <div key={i} className="rounded-2xl border border-line-soft p-4 space-y-3">
                          <div className="flex gap-3">
                            <input
                              type="text" value={d.label} onChange={(e) => updateDebt(i, 'label', e.target.value)}
                              placeholder="Label (e.g. Visa)" className={inputClass}
                            />
                            <button
                              type="button" onClick={() => removeDebt(i)} aria-label="Remove debt"
                              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-surface-body border border-line-soft text-text-dim hover:text-accent hover:border-accent transition-colors"
                            >&times;</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-text-dim mb-1.5 block">Balance (AUD)</label>
                              <input type="number" min="0" step="100" value={d.balance} onChange={(e) => updateDebt(i, 'balance', e.target.value)} placeholder="0" className={inputClass} />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-text-dim mb-1.5 block">Interest rate (%)</label>
                              <input type="number" min="0" max="100" step="0.1" value={d.rate} onChange={(e) => updateDebt(i, 'rate', e.target.value)} placeholder="19.9" className={inputClass} />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-text-dim mb-1.5 block">Type</label>
                              <select value={d.type} onChange={(e) => updateDebt(i, 'type', e.target.value)} className={inputClass}>
                                {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* HECS — visually separated because it is not an ordinary debt */}
                <section className="rounded-2xl border-2 border-line-soft bg-surface-body/40 p-6">
                  <h2 className="font-display font-bold tracking-tight text-xl mb-2">HECS / HELP</h2>
                  <p className="text-xs text-text-dim mb-6 leading-relaxed">
                    HECS has no interest rate. It grows by indexation once a year and its repayments are worked out
                    from your income &mdash; so it gets its own section, not a &ldquo;rate&rdquo;. Leave blank if you have no HELP debt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-text-dim mb-1.5 block">HECS/HELP balance (AUD)</label>
                      <input type="number" min="0" step="100" value={hecsBalance} onChange={(e) => setHecsBalance(e.target.value)} placeholder="0" className={inputClass} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-dim mb-1.5 block">Annual repayment income (AUD)</label>
                      <input type="number" min="0" step="1000" value={repaymentIncome} onChange={(e) => setRepaymentIncome(e.target.value)} placeholder="0" className={inputClass} />
                      <p className="text-[11px] text-text-dim mt-1.5">Roughly your income before tax (used for this calculation only, not saved to your profile). Not exactly gross salary &mdash; the ATO adds a few items.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-dim mb-1.5 block">Assumed indexation (%)</label>
                      <input type="number" min="0" max="20" step="0.1" value={indexationRate} onChange={(e) => setIndexationRate(e.target.value)} placeholder="3.2" className={inputClass} />
                      <p className="text-[11px] text-text-dim mt-1.5">HELP was indexed 3.2% on 1 June 2025.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-dim mb-1.5 block">Voluntary repayment / year (optional)</label>
                      <input type="number" min="0" step="100" value={voluntaryAnnual} onChange={(e) => setVoluntaryAnnual(e.target.value)} placeholder="0" className={inputClass} />
                    </div>
                  </div>
                </section>

                {/* Spare money */}
                <section>
                  <label className="text-sm font-semibold text-text-dim mb-3 block">Spare money per month to direct (optional)</label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors max-w-xs">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                    <input type="number" min="0" step="10" value={extraMonthlyAmount} onChange={(e) => setExtraMonthlyAmount(e.target.value)} placeholder="0"
                      className="w-full bg-transparent pl-8 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                  </div>
                </section>

                {error && <p className="text-sm font-semibold text-accent">{error}</p>}
                <button type="submit" disabled={running} className="btn-primary w-full py-5 text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0">
                  {running ? 'Calculating…' : 'Save & Recalculate'}
                </button>
              </form>
            </div>

            {/* ---------------- Results panel ---------------- */}
            <div className="lg:col-span-5 block-blue rounded-3xl p-8 lg:p-12 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
              <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Cost ranking</h2>
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-sm font-display font-extrabold mb-6">1·2·3</div>
                  <p className="text-sm font-medium text-text-muted">Add your debts and press Save &amp; Recalculate.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <p className="text-sm leading-relaxed text-text-primary">{result.summary}</p>

                  {result.order.length > 0 && (
                    <ol className="space-y-3">
                      {result.order.map((item, i) => (
                        <li
                          key={`${item.kind}-${i}`}
                          className={`rounded-2xl p-5 ${item.kind === 'hecs' ? 'bg-surface-raised border-2 border-accent-soft' : 'bg-surface-raised'}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="shrink-0 w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-display font-extrabold">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="font-display font-bold text-sm text-text-primary truncate">{item.label}</p>
                                <span className="shrink-0 text-[11px] font-bold text-text-dim">
                                  {item.kind === 'hecs' ? `~${item.displayRate}% indexed` : `${item.displayRate}%`}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted leading-relaxed">{item.reason}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* HECS callout — clearly information, not instruction */}
                  {result.hecs && (
                    <div className="rounded-2xl bg-surface-raised border-l-4 border-accent p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-accent-soft text-accent px-2.5 py-1 rounded-full">Information, not a recommendation</span>
                      </div>
                      <h3 className="font-display font-bold text-base text-text-primary mb-2">Your HECS/HELP</h3>
                      <p className="text-xs text-text-muted leading-relaxed mb-5">{result.hecs.message}</p>
                      <dl className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <dt className="text-text-dim font-semibold mb-0.5">Compulsory this year</dt>
                          <dd className="font-bold text-text-primary">{formatCurrency(result.hecs.compulsoryRepayment)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-dim font-semibold mb-0.5">Balance after next indexation</dt>
                          <dd className="font-bold text-text-primary">{formatCurrency(result.hecs.projectedBalanceAfterIndexation)}</dd>
                        </div>
                      </dl>
                      <p className="text-[11px] text-text-dim mt-4 leading-relaxed">
                        Projection under the income and indexation you entered; compulsory repayment is income-contingent, not a bill you choose.
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-text-dim leading-relaxed border-t border-line-soft/40 pt-5">{result.disclaimer}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtSequencer;
