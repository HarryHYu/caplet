import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { calculateBasketInflation, calculateSalaryEstimate, MONEY_CONTENT_VERSION } from '../lib/moneyCalculations';
import { FinancialAssumptions } from '../components/AccessibleUI';

const CPI_FALLBACK = {
  indicator: {
    id: 'abs.cpi.all-groups.annual',
    publisher: 'Australian Bureau of Statistics',
    seriesTitle: 'All groups CPI, Australia — annual movement',
    value: 4.0,
    unit: 'percent',
    observationPeriod: '2026-05',
    status: 'fixture',
  },
  provenance: {
    publishedAt: '2026-06-24T01:30:00Z',
    retrievedAt: null,
    nextExpectedReleaseAt: '2026-07-29T01:30:00Z',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
  },
};

const moneyEvent = (type, entityId, metadata = {}) => api.logEvent?.({
  type,
  feature: 'money_pilot',
  entityType: 'money_mission',
  entityId,
  schemaVersion: 1,
  idempotencyKey: `money:${type}:${entityId}:${Date.now()}`,
  metadata: { contentVersion: MONEY_CONTENT_VERSION, ...metadata },
});

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function SourceCard({ data }) {
  const indicator = data?.indicator || CPI_FALLBACK.indicator;
  const provenance = data?.provenance || CPI_FALLBACK.provenance;
  const isFixture = indicator.status === 'fixture';
  return (
    <aside className="rounded-3xl border border-line-soft bg-surface-raised p-6" aria-label="Official source information">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Official source</p>
          <h2 className="mt-2 font-display text-xl font-extrabold">ABS Consumer Price Index</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isFixture ? 'bg-surface-soft text-text-muted' : 'bg-[color:var(--block-green)] text-text-primary'}`}>
          {isFixture ? 'Prototype fixture' : 'Verified'}
        </span>
      </div>
      <p className="mt-5 text-4xl font-display font-extrabold tracking-tight">{indicator.value?.toFixed(1)}%</p>
      <p className="mt-2 text-sm font-semibold text-text-muted">Annual movement in the 12 months to {indicator.observationPeriod}</p>
      <dl className="mt-5 space-y-2 text-xs font-medium text-text-dim">
        <div className="flex justify-between gap-4"><dt>Released</dt><dd>{formatDate(provenance.publishedAt)}</dd></div>
        <div className="flex justify-between gap-4"><dt>Retrieved</dt><dd>{formatDate(provenance.retrievedAt)}</dd></div>
        <div className="flex justify-between gap-4"><dt>Next expected</dt><dd>{formatDate(provenance.nextExpectedReleaseAt)}</dd></div>
      </dl>
      <a className="mt-5 inline-flex text-sm font-bold text-accent underline underline-offset-4" href={provenance.sourceUrl} target="_blank" rel="noreferrer">
        Open ABS release
      </a>
      {isFixture ? <p className="mt-4 text-xs font-semibold leading-relaxed text-text-dim">This prototype uses the latest reviewed release as a fixture until the server-side ABS source is configured. It must not be treated as a live feed.</p> : null}
    </aside>
  );
}

function MoneyLayout({ children, title = 'Money' }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-hand text-xl text-accent">Money · financial firsts</span>
            <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight md:text-7xl">{title}</h1>
          </div>
          <nav aria-label="Money navigation" className="flex flex-wrap gap-2 text-sm font-bold">
            {[['/money', 'Home'], ['/money/learn', 'Learn'], ['/money/economy', 'Economy'], ['/money/tools', 'Tools']].map(([path, label]) => (
              <Link key={path} to={path} className={`rounded-full px-4 py-2 transition-colors ${location.pathname === path || (path !== '/money' && location.pathname.startsWith(path)) ? 'bg-accent text-white' : 'bg-surface-raised text-text-muted hover:text-accent'}`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}

function MissionCard({ title, description, href, meta, tone = 'block-blue' }) {
  return (
    <Link to={href} className={`group rounded-3xl ${tone} p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] transition-transform hover:-translate-y-1`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{meta}</p>
      <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text-primary">{title}</h2>
      <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-text-muted">{description}</p>
      <span className="mt-7 inline-flex rounded-full bg-surface-raised px-4 py-2 text-sm font-bold text-accent group-hover:bg-accent group-hover:text-white">Start mission →</span>
    </Link>
  );
}

export function MoneyHome() {
  useEffect(() => { moneyEvent('money_slice_started', 'money-home', { stepId: 'home' }); }, []);
  return (
    <MoneyLayout title="Money, made practical.">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-surface-raised p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] md:p-12">
          <p className="max-w-2xl text-xl font-medium leading-relaxed text-text-muted">Short, guided missions for the moments when money starts becoming real: your first pay, rising prices and the economic ideas behind them.</p>
          <div className="mt-8 grid gap-4 text-sm font-bold text-text-primary sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-soft p-4">Learn the idea</div>
            <div className="rounded-2xl bg-surface-soft p-4">Try a scenario</div>
            <div className="rounded-2xl bg-surface-soft p-4">Apply it to Study</div>
          </div>
          <div className="mt-8 rounded-2xl border border-line-soft bg-surface-soft p-5 text-sm font-medium leading-relaxed text-text-muted">
            Money activity is private by default. Calculator inputs are not saved, and nothing is sent to a teacher automatically. This is education and scenario modelling, not personal financial advice.
          </div>
        </div>
        <SourceCard data={CPI_FALLBACK} />
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2" aria-label="Money missions">
        <MissionCard meta="Mission 01 · first job" title="Read your first payslip" description="Separate gross pay, tax withholding, take-home pay and super, then estimate what a pay packet could look like." href="/money/learn/first-job" />
        <MissionCard meta="Mission 02 · cost of living" title="Make sense of inflation" description="Use an official CPI release, explore a synthetic basket and turn the evidence into an HSC-style explanation." href="/money/learn/inflation-cost-of-living" tone="block-cream" />
      </section>
    </MoneyLayout>
  );
}

export function MoneyLearn() {
  return (
    <MoneyLayout title="Learn by doing.">
      <p className="max-w-2xl text-xl font-medium leading-relaxed text-text-muted">Each mission follows a simple loop: understand one idea, manipulate a safe scenario, then explain what the evidence means.</p>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <MissionCard meta="First job" title="Read your first payslip" description="Gross pay, withholding, Medicare, super and a transparent annual estimate." href="/money/learn/first-job" />
        <MissionCard meta="Inflation" title="Make sense of cost of living" description="Official CPI, a synthetic basket and a short HSC-style application." href="/money/learn/inflation-cost-of-living" tone="block-cream" />
      </section>
    </MoneyLayout>
  );
}

export function MoneyEconomy() {
  const [data, setData] = useState(CPI_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    api.request('/money/indicators/cpi').then((result) => { if (!cancelled && result) setData(result); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return (
    <MoneyLayout title="Economy, with context.">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SourceCard data={data} />
        <div className="rounded-3xl bg-surface-raised p-8 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Why this matters</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold">A headline is a starting point, not a personal diagnosis.</h2>
          <p className="mt-5 text-base font-medium leading-relaxed text-text-muted">CPI tracks changes across a weighted basket of household expenditure. Your household may face a different mix of price changes. The useful skill is interpreting the measure and its limits.</p>
          <Link to="/money/learn/inflation-cost-of-living" className="btn-primary mt-8 inline-flex">Use the CPI in a scenario</Link>
        </div>
      </div>
    </MoneyLayout>
  );
}

export function MoneyTools() {
  return (
    <MoneyLayout title="Tools with a reason.">
      <p className="max-w-2xl text-xl font-medium leading-relaxed text-text-muted">Use the existing calculators when a mission gives you a question to answer. They remain general educational estimates.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[['Salary estimate', '/fintools/salary', 'Estimate annual pay from an hourly rate.'], ['Tax estimate', '/fintools/tax-calculator', 'Explore simplified resident rates.'], ['Inflation calculator', '/fintools/inflation', 'Model a clearly labelled assumption.']].map(([title, href, description]) => (
          <Link key={href} to={href} className="rounded-3xl bg-surface-raised p-6 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform">
            <h2 className="font-display text-2xl font-extrabold">{title}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{description}</p>
            <span className="mt-6 inline-flex text-sm font-bold text-accent">Open tool →</span>
          </Link>
        ))}
      </div>
    </MoneyLayout>
  );
}

export function FirstJobMission() {
  const [hourlyRate, setHourlyRate] = useState('22');
  const [hoursPerWeek, setHoursPerWeek] = useState('15');
  const [result, setResult] = useState(null);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const estimate = useMemo(() => calculateSalaryEstimate({ hourlyRate, hoursPerWeek }), [hourlyRate, hoursPerWeek]);
  const submit = (event) => {
    event.preventDefault();
    setResult(estimate);
    moneyEvent('finance_calculation_completed', 'first-job', { toolId: 'salary-estimate', calculationVersion: estimate.calculationVersion, scenarioType: 'synthetic' });
  };
  const checkAnswer = () => {
    setChecked(true);
    moneyEvent('money_step_completed', 'first-job', { stepId: 'knowledge-check', correct: answer === 'super' });
  };
  return (
    <MoneyLayout title="Your first pay packet.">
      <div className="max-w-4xl">
        <p className="text-xl font-medium leading-relaxed text-text-muted">This is a synthetic example. It helps you reason about a payslip without asking for your own financial records.</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl bg-surface-raised p-7 md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 1 · read</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold">A fortnightly payslip</h2>
            <dl className="mt-7 space-y-4 text-sm">
              {[
                ['Gross pay', '$660.00', 'Pay before deductions'],
                ['PAYG withholding', '-$48.00', 'A withholding estimate, not your final tax bill'],
                ['Net pay', '$612.00', 'The amount paid to the worker'],
                ['Employer super', '$79.20', 'Paid into super, not take-home pay'],
              ].map(([term, value, description]) => <div key={term} className="border-b border-line-soft pb-3"><div className="flex justify-between gap-4 font-bold"><dt>{term}</dt><dd>{value}</dd></div><dd className="mt-1 text-xs font-medium text-text-dim">{description}</dd></div>)}
            </dl>
          </section>
          <section className="rounded-3xl bg-block-blue p-7 md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 2 · do</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold">Estimate annual pay</h2>
            <form className="mt-7 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-bold">Hourly rate (AUD)<input className="mt-2 w-full rounded-xl border border-line-soft bg-surface-raised px-4 py-3 text-lg font-bold" type="number" min="0" step="0.50" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} /></label>
              <label className="block text-sm font-bold">Hours per week<input className="mt-2 w-full rounded-xl border border-line-soft bg-surface-raised px-4 py-3 text-lg font-bold" type="number" min="0" max="80" step="0.5" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} /></label>
              <button className="btn-primary w-full" type="submit">Calculate estimate</button>
            </form>
            {result ? <div className="mt-7 rounded-2xl bg-surface-raised p-5"><p className="text-xs font-bold text-text-muted">Estimated annual take-home</p><p className="mt-2 font-display text-4xl font-extrabold">{formatCurrency(result.netAnnual)}</p><p className="mt-3 text-sm font-medium text-text-muted">Gross {formatCurrency(result.gross)} · estimated super {formatCurrency(result.superAmount)}</p></div> : null}
          </section>
        </div>
        <section className="mt-8 rounded-3xl bg-surface-raised p-7 md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 3 · check</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold">Which amount is not part of take-home pay?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">{[['gross', 'Gross pay'], ['net', 'Net pay'], ['super', 'Employer super']].map(([value, label]) => <button key={value} type="button" onClick={() => setAnswer(value)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${answer === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-soft hover:border-accent'}`}>{label}</button>)}</div>
          <button type="button" onClick={checkAnswer} disabled={!answer} className="btn-secondary mt-5 disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>
          {checked ? <p className={`mt-4 text-sm font-bold ${answer === 'super' ? 'text-[color:var(--mark-green)]' : 'text-text-error'}`}>{answer === 'super' ? 'Correct. Employer super is paid into super, not into the worker’s take-home pay.' : 'Not quite. Try separating money paid to you now from money paid into super.'}</p> : null}
        </section>
        <FinancialAssumptions period="2026–27 estimate" verified="Calculation version salary-estimate-v1" included={['Australian resident marginal rates', 'Simplified 2% Medicare levy estimate', '12% super estimate on the supplied scenario']} excluded={['PAYG withholding tables', 'HELP debt, deductions, offsets and salary packaging', 'Personal employment or tax circumstances']} sources={[{ label: 'ATO tax and super information', href: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds' }]} />
        <button type="button" className="mt-8 text-sm font-bold text-text-muted underline underline-offset-4" onClick={() => navigate('/money/learn')}>← Back to Learn</button>
      </div>
    </MoneyLayout>
  );
}

export function InflationMission() {
  const [data, setData] = useState(CPI_FALLBACK);
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState('');
  const basket = useMemo(() => calculateBasketInflation([
    { name: 'Transport', base: 30, change: 3.3 },
    { name: 'Food', base: 45, change: 3.3 },
    { name: 'Housing', base: 25, change: 6.5 },
  ]), []);
  useEffect(() => {
    api.request('/money/indicators/cpi').then((result) => { if (result) setData(result); }).catch(() => {});
    moneyEvent('money_slice_started', 'inflation-cost-of-living', { stepId: 'start' });
  }, []);
  const checkAnswer = () => {
    setChecked(true);
    moneyEvent('money_step_completed', 'inflation-cost-of-living', { stepId: 'hsc-application', correct: answer === 'cpi-limit' });
  };
  return (
    <MoneyLayout title="Inflation, with evidence.">
      <div className="max-w-4xl">
        <p className="text-xl font-medium leading-relaxed text-text-muted">Start with an official measure, then test why a single national number cannot describe every household’s experience.</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SourceCard data={data} />
          <section className="rounded-3xl bg-surface-raised p-7 md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 2 · do</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold">A synthetic student basket</h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">This basket is deliberately invented. It is not a calculation of your own spending.</p>
            <div className="mt-6 space-y-3">{basket.rows.map((row) => <div key={row.name} className="flex justify-between rounded-2xl bg-surface-soft p-4 text-sm font-bold"><span>{row.name}</span><span>+{row.change.toFixed(1)}%</span></div>)}</div>
            <div className="mt-6 rounded-2xl bg-block-cream p-5"><p className="text-xs font-bold text-text-muted">Synthetic basket movement</p><p className="mt-2 font-display text-4xl font-extrabold">{basket.movement.toFixed(1)}%</p><p className="mt-2 text-sm font-medium text-text-muted">The result differs from headline CPI because this basket has its own weights and price changes.</p></div>
          </section>
        </div>
        <section className="mt-8 rounded-3xl bg-block-blue p-7 md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 3 · apply</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold">Which claim uses CPI appropriately?</h2>
          <div className="mt-5 grid gap-3">{[['personal', 'The CPI is my exact personal inflation rate.'], ['cpi-limit', 'The CPI is an aggregate measure; different households can face different price changes.'], ['advice', 'The CPI tells me what financial product I should buy.']].map(([value, label]) => <button key={value} type="button" onClick={() => setAnswer(value)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${answer === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-soft hover:border-accent'}`}>{label}</button>)}</div>
          <button type="button" onClick={checkAnswer} disabled={!answer} className="btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50">Check application</button>
          {checked ? <p className={`mt-4 text-sm font-bold ${answer === 'cpi-limit' ? 'text-[color:var(--mark-green)]' : 'text-text-error'}`}>{answer === 'cpi-limit' ? 'Correct. That is the useful economic interpretation and it avoids turning an aggregate measure into personal advice.' : 'Try again. CPI is a national statistical measure, not personal advice or an exact household result.'}</p> : null}
        </section>
        <FinancialAssumptions period="Latest ABS release" included={['ABS headline CPI observation', 'A synthetic basket with explicit weights']} excluded={['Your household’s personal inflation rate', 'A forecast or recommendation']} sources={[{ label: 'ABS Consumer Price Index', href: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release' }, { label: 'ABS Indicator API', href: 'https://www.abs.gov.au/statistics/application-programming-interfaces-apis/indicator-api' }]} />
      </div>
    </MoneyLayout>
  );
}

export default MoneyHome;

