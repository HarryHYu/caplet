import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { FinancialAssumptions, FormField } from '../components/AccessibleUI';
import api from '../services/api';
import { MONEY_STORAGE_KEYS, writeMoneyStorage } from '../data/moneyPrototype';

const CPI_SNAPSHOT = {
  value: 4.0,
  previousValue: 4.2,
  referencePeriod: 'May 2026',
  previousPeriod: 'April 2026',
  released: '24 June 2026',
  verified: '13 July 2026',
  nextRelease: '29 July 2026',
  sourceLabel: 'ABS Consumer Price Index, Australia',
  sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/may-2026',
  methodologyUrl: 'https://www.abs.gov.au/methodologies/consumer-price-index-australia-methodology/may-2026',
};

const money = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value)) : 'Not supplied';

export default function MoneyInflation() {
  const [price, setPrice] = useState('20');
  const [years, setYears] = useState('5');
  const [assumedRate, setAssumedRate] = useState('3');
  const [result, setResult] = useState(null);
  const [indicator, setIndicator] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getMoneyIndicatorHistory('au.cpi.headline.yoy', { limit: 24 }),
    ]).then(([response]) => {
      if (!active) return;
      setIndicator(response);
      setHistory(response.observations || []);
    }).catch(() => {
      if (!active) return;
      setIndicator({
        isLocalSnapshot: true,
        series: { title: CPI_SNAPSHOT.sourceLabel, nativeFrequency: 'monthly', sourceUrl: CPI_SNAPSHOT.sourceUrl, source: { url: CPI_SNAPSHOT.sourceUrl, termsUrl: CPI_SNAPSHOT.methodologyUrl } },
        current: { value: CPI_SNAPSHOT.value, periodLabel: CPI_SNAPSHOT.referencePeriod, retrievedAt: '2026-07-13T00:00:00.000Z', revisionState: 'published' },
        freshness: { state: 'dated local snapshot', message: `Verified ${CPI_SNAPSHOT.verified}; not updated automatically.` },
      });
      setHistory([
        { periodLabel: CPI_SNAPSHOT.previousPeriod, value: CPI_SNAPSHOT.previousValue, revisionState: 'published' },
        { periodLabel: CPI_SNAPSHOT.referencePeriod, value: CPI_SNAPSHOT.value, revisionState: 'published' },
      ]);
      setError('Live retrieval is unavailable, so this page is showing a clearly labelled dated local snapshot.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const current = indicator?.current;
  const currentValue = Number(current?.value);
  const hasCurrent = Number.isFinite(currentValue);
  const source = indicator?.series?.source;
  const sourceUrl = indicator?.series?.sourceUrl || source?.url;
  const currentPeriod = current?.periodLabel || current?.observationDate || 'the latest validated period';

  const runExperiment = (event) => {
    event.preventDefault();
    const amount = Math.max(0, Number(price) || 0);
    const horizon = Math.max(1, Math.min(50, Number(years) || 1));
    const rate = Math.max(0, Math.min(100, Number(assumedRate) || 0));
    const nextResult = { amount, horizon, rate, futurePrice: amount * ((1 + rate / 100) ** horizon) };
    setResult(nextResult);
    writeMoneyStorage(MONEY_STORAGE_KEYS.inflationExperiment, nextResult);
  };

  const indicatorRows = useMemo(() => history.slice(-12).map((row) => ({
    period: row.periodLabel || row.observationDate,
    annualChange: Number(row.value),
    status: row.revisionState === 'revised' ? 'Revised published observation' : row.isProvisional ? 'Provisional published observation' : 'Published observation',
  })).filter((row) => Number.isFinite(row.annualChange)), [history]);

  return (
    <div className="min-h-screen bg-surface-body pb-32 pt-28 selection:bg-accent selection:text-white md:pt-32 lg:pb-20">
      <div className="container-custom">
        <Link to="/money" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-text-muted hover:text-accent">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Money overview
        </Link>

        <header className="mt-6 max-w-4xl">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">Australia now, explained</span>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">Inflation and everyday prices.</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">Understand one dated indicator first. Then try a separate hypothetical example.</p>
        </header>

        <section className="mt-10 overflow-hidden rounded-3xl bg-surface-raised p-7 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)] md:p-10" aria-labelledby="cpi-card-title">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-extrabold text-accent">{indicator?.isLocalSnapshot ? 'Dated local snapshot · not a live feed' : 'Official ABS series'}</span>
                <span className="rounded-full bg-[color:var(--block-green)] px-3 py-1.5 text-xs font-bold text-text-primary">{indicator?.freshness?.state || 'loading'}</span>
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Consumer Price Index</p>
              <h2 id="cpi-card-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">
                {loading ? 'Loading the latest validated observation…' : hasCurrent ? `Inflation was ${currentValue.toFixed(1)}% through the year to ${currentPeriod}.` : 'No validated CPI observation is available yet.'}
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-text-muted">
                {hasCurrent ? `${error ? `${error} ` : ''}This ${indicator.series.nativeFrequency} observation is not a forecast. It describes the CPI basket, not every household's prices.` : error || 'The source adapter has not published an observation for this series.'}
              </p>
            </div>
            <div className="min-w-56 rounded-3xl bg-[color:var(--block-blue)] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Published annual change</p>
              <p className="mt-2 font-display text-6xl font-extrabold tracking-tight text-accent">{hasCurrent ? `${currentValue.toFixed(1)}%` : '—'}</p>
              <p className="mt-2 text-sm font-bold text-text-muted">{indicator?.freshness?.message || 'Waiting for validated source data.'}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-soft p-5"><CalendarDaysIcon className="h-5 w-5 text-accent" aria-hidden="true" /><h3 className="mt-3 text-base font-extrabold text-text-primary">Reference and release</h3><p className="mt-2 text-sm font-medium text-text-muted">Reference period {current?.periodLabel || current?.observationDate || 'not supplied'}. {indicator?.isLocalSnapshot ? `Released ${CPI_SNAPSHOT.released}. Next scheduled release ${CPI_SNAPSHOT.nextRelease}.` : `Retrieved ${dateLabel(current?.retrievedAt)}.`}</p></div>
            <div className="rounded-2xl bg-surface-soft p-5"><InformationCircleIcon className="h-5 w-5 text-accent" aria-hidden="true" /><h3 className="mt-3 text-base font-extrabold text-text-primary">Why it may matter</h3><p className="mt-2 text-sm font-medium text-text-muted">Inflation can change what a fixed amount of money buys. Your own costs may move differently from the national CPI basket.</p></div>
            <div className="rounded-2xl bg-surface-soft p-5"><ChartBarSquareIcon className="h-5 w-5 text-accent" aria-hidden="true" /><h3 className="mt-3 text-base font-extrabold text-text-primary">Revision status</h3><p className="mt-2 text-sm font-medium text-text-muted">{current?.revisionState === 'revised' ? `This observation was revised on ${dateLabel(current.revisionDetectedAt)}.` : 'The provenance record identifies provisional and revised observations.'}</p></div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="btn-secondary">Official ABS release <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" /></a>}
            {source?.termsUrl && <a href={source.termsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-accent underline underline-offset-4">Source terms <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" /></a>}
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-[color:var(--block-cream)] p-7 md:p-10" aria-labelledby="inflation-explainer-title">
          <span className="section-kicker">Explain · see · try · check · connect</span>
          <h2 id="inflation-explainer-title" className="font-display text-3xl font-extrabold tracking-tight text-text-primary">What does the CPI actually measure?</h2>
          <div className="mt-5 grid gap-5 text-sm font-medium leading-relaxed text-text-muted md:grid-cols-2"><p>The CPI tracks price changes for a weighted basket of goods and services purchased by Australian households. An annual result compares the basket with the same period a year earlier.</p><p>It is not a forecast and it does not mean every price rose by the same amount. Link the observation to aggregate demand, supply conditions, purchasing power and living standards in the relevant HSC Economics edition.</p></div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-12" aria-labelledby="inflation-experiment-title">
          <div className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)] lg:col-span-7 md:p-10"><span className="section-kicker">Hypothetical experiment</span><h2 id="inflation-experiment-title" className="font-display text-3xl font-extrabold tracking-tight text-text-primary">Try a made-up rate.</h2><p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">The rate below is your assumption. It is not the current CPI value above and it does not predict future prices.</p><form onSubmit={runExperiment} className="mt-8 grid gap-6 sm:grid-cols-3"><FormField id="inflation-price" label="Starting price (AUD)" hint="A sample item price">{(props) => <input {...props} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}</FormField><FormField id="inflation-years" label="Years" hint="Between 1 and 50">{(props) => <input {...props} type="number" min="1" max="50" step="1" value={years} onChange={(event) => setYears(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}</FormField><FormField id="inflation-rate" label="Assumed annual rate (%)" hint="Hypothetical input, not live CPI">{(props) => <input {...props} type="number" min="0" max="100" step="0.1" value={assumedRate} onChange={(event) => setAssumedRate(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}</FormField><button type="submit" className="btn-primary min-h-12 sm:col-span-3 sm:w-fit">Run sample scenario</button></form></div>
          <div className="rounded-3xl bg-[color:var(--block-blue)] p-7 lg:col-span-5 md:p-10" aria-live="polite"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Scenario result</p>{result ? <div role="status" className="mt-4"><p className="font-display text-4xl font-extrabold tracking-tight text-text-primary">About {money(result.futurePrice)}</p><p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">A {money(result.amount)} item growing at your assumed {result.rate.toFixed(1)}% each year for {result.horizon} years. This is a mathematical scenario, not a price forecast.</p></div> : <p className="mt-4 text-sm font-medium text-text-muted">Use the sample inputs, then run the scenario to see a result.</p>}</div>
        </section>

        <div className="mt-8"><FinancialAssumptions period="Hypothetical experiment" verified="Inputs are session-only" included={['Your starting price, assumed annual rate and number of years', 'Annual compounding for the sample calculation']} excluded={['A forecast of future CPI', 'Different price movements across household categories', 'Personal financial circumstances']} sources={sourceUrl ? [{ label: indicator?.series?.title || 'ABS Consumer Price Index', href: sourceUrl }] : []} /></div>

        <section className="mt-8 overflow-x-auto rounded-3xl bg-surface-raised p-6" aria-labelledby="inflation-table-title"><h2 id="inflation-table-title" className="font-display text-xl font-extrabold text-text-primary">Published observations</h2><p className="mt-2 text-sm font-medium text-text-muted">Reference dates and values are shown exactly as received from the validated source adapter.</p><table className="mt-5 w-full min-w-[32rem] text-left text-sm"><caption className="sr-only">Validated annual Consumer Price Index observations</caption><thead><tr className="border-b border-line-soft text-text-dim"><th className="py-3 pr-4">Reference period</th><th className="py-3 pr-4">Annual change</th><th className="py-3">Status</th></tr></thead><tbody>{indicatorRows.length ? indicatorRows.map((row) => <tr key={row.period} className="border-b border-line-soft/60"><td className="py-3 pr-4 font-bold text-text-primary">{row.period}</td><td className="py-3 pr-4 text-text-primary">{row.annualChange.toFixed(1)}%</td><td className="py-3 text-text-muted">{row.status}</td></tr>) : <tr><td colSpan="3" className="py-6 text-text-muted">No validated observations are available.</td></tr>}</tbody></table></section>
      </div>
    </div>
  );
}
