import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { FinancialAssumptions, FormField } from '../components/AccessibleUI';
import { CPI_SNAPSHOT, MONEY_STORAGE_KEYS, writeMoneyStorage } from '../data/moneyPrototype';

const money = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

export default function MoneyInflation() {
  const [price, setPrice] = useState('20');
  const [years, setYears] = useState('5');
  const [assumedRate, setAssumedRate] = useState('3');
  const [result, setResult] = useState(null);

  const indicatorRows = useMemo(() => [
    { period: CPI_SNAPSHOT.referencePeriod, annualChange: CPI_SNAPSHOT.value, status: 'Local official-data snapshot' },
    { period: CPI_SNAPSHOT.previousPeriod, annualChange: CPI_SNAPSHOT.previousValue, status: 'Previous published period' },
  ], []);

  const runExperiment = (event) => {
    event.preventDefault();
    const amount = Math.max(0, Number(price) || 0);
    const horizon = Math.max(1, Math.min(50, Number(years) || 1));
    const rate = Math.max(0, Math.min(100, Number(assumedRate) || 0));
    const futurePrice = amount * ((1 + rate / 100) ** horizon);
    const nextResult = { amount, horizon, rate, futurePrice };
    setResult(nextResult);
    writeMoneyStorage(MONEY_STORAGE_KEYS.inflationExperiment, nextResult);
  };

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
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-extrabold text-accent">Dated local snapshot · not a live feed</span>
                <span className="rounded-full bg-[color:var(--block-green)] px-3 py-1.5 text-xs font-bold text-text-primary">Verified {CPI_SNAPSHOT.verified}</span>
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Consumer Price Index</p>
              <h2 id="cpi-card-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">Inflation was {CPI_SNAPSHOT.value.toFixed(1)}% through the year to {CPI_SNAPSHOT.referencePeriod}.</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-text-muted">That was lower than {CPI_SNAPSHOT.previousValue.toFixed(1)}% in {CPI_SNAPSHOT.previousPeriod}. It means the CPI basket cost more than a year earlier, but this figure does not describe every household or every price.</p>
            </div>
            <div className="min-w-56 rounded-3xl bg-[color:var(--block-blue)] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Published annual change</p>
              <p className="mt-2 font-display text-6xl font-extrabold tracking-tight text-accent">{CPI_SNAPSHOT.value.toFixed(1)}%</p>
              <p className="mt-2 text-sm font-bold text-text-muted">Down {Math.abs(CPI_SNAPSHOT.value - CPI_SNAPSHOT.previousValue).toFixed(1)} percentage points from the previous period</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-soft p-5">
              <CalendarDaysIcon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-text-primary">Reference and release</h3>
              <p className="mt-2 text-sm font-medium text-text-muted">Reference period {CPI_SNAPSHOT.referencePeriod}. Released {CPI_SNAPSHOT.released}. Next scheduled release {CPI_SNAPSHOT.nextRelease}.</p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-5">
              <InformationCircleIcon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-text-primary">Why it may matter</h3>
              <p className="mt-2 text-sm font-medium text-text-muted">Inflation can change what a fixed amount of money buys. Your own costs may move differently from the national CPI basket.</p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-5">
              <ChartBarSquareIcon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-text-primary">Revision and freshness</h3>
              <p className="mt-2 text-sm font-medium text-text-muted">The ABS may revise published series. This prototype copy does not update automatically, so check the official release before relying on it.</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href={CPI_SNAPSHOT.sourceUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              Official ABS release <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href={CPI_SNAPSHOT.methodologyUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-accent underline underline-offset-4">
              How the ABS measures CPI <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-[color:var(--block-cream)] p-7 md:p-10" aria-labelledby="inflation-explainer-title">
          <span className="section-kicker">Plain-language explainer</span>
          <h2 id="inflation-explainer-title" className="font-display text-3xl font-extrabold tracking-tight text-text-primary">What does the CPI actually measure?</h2>
          <div className="mt-5 grid gap-5 text-sm font-medium leading-relaxed text-text-muted md:grid-cols-2">
            <p>The CPI tracks price changes for a weighted basket of goods and services purchased by Australian households. A 4.0% annual result describes the basket’s change across the year.</p>
            <p>It is not a forecast and it does not mean every price rose by 4.0%. Rent, food, transport and other categories can move by different amounts, and each household buys a different mix.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-12" aria-labelledby="inflation-experiment-title">
          <div className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)] lg:col-span-7 md:p-10">
            <span className="section-kicker">Hypothetical experiment</span>
            <h2 id="inflation-experiment-title" className="font-display text-3xl font-extrabold tracking-tight text-text-primary">Try a made-up rate.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">The rate below is your assumption. It is not the current CPI value above and it does not predict future prices.</p>
            <form onSubmit={runExperiment} className="mt-8 grid gap-6 sm:grid-cols-3">
              <FormField id="inflation-price" label="Starting price (AUD)" hint="A sample item price">
                {(props) => <input {...props} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="inflation-years" label="Years" hint="Between 1 and 50">
                {(props) => <input {...props} type="number" min="1" max="50" step="1" value={years} onChange={(event) => setYears(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="inflation-rate" label="Assumed annual rate (%)" hint="Hypothetical input, not live CPI">
                {(props) => <input {...props} type="number" min="0" max="100" step="0.1" value={assumedRate} onChange={(event) => setAssumedRate(event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <button type="submit" className="btn-primary min-h-12 sm:col-span-3 sm:w-fit">Run sample scenario</button>
            </form>
          </div>

          <div className="rounded-3xl bg-[color:var(--block-blue)] p-7 lg:col-span-5 md:p-10" aria-live="polite">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Scenario result</p>
            {result ? (
              <div role="status" className="mt-4">
                <p className="font-display text-4xl font-extrabold tracking-tight text-text-primary">About {money(result.futurePrice)}</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">A {money(result.amount)} item growing at your assumed {result.rate.toFixed(1)}% each year for {result.horizon} years. This is a mathematical scenario, not a price forecast.</p>
              </div>
            ) : (
              <p className="mt-4 text-sm font-medium text-text-muted">Use the sample inputs, then run the scenario to see a result.</p>
            )}
          </div>
        </section>

        <div className="mt-8">
          <FinancialAssumptions
            period="Hypothetical experiment"
            verified={CPI_SNAPSHOT.verified}
            included={['Your starting price, assumed annual rate and number of years', 'Annual compounding for the sample calculation']}
            excluded={['A forecast of future CPI', 'Different price movements across household categories', 'Personal financial circumstances']}
            sources={[{ label: CPI_SNAPSHOT.sourceLabel, href: CPI_SNAPSHOT.sourceUrl }]}
          />
        </div>

        <section className="mt-8 overflow-x-auto rounded-3xl bg-surface-raised p-6" aria-labelledby="inflation-table-title">
          <h2 id="inflation-table-title" className="font-display text-xl font-extrabold text-text-primary">Text and table alternative</h2>
          <p className="mt-2 text-sm font-medium text-text-muted">The local snapshot shows annual CPI growth of {CPI_SNAPSHOT.value.toFixed(1)}% in {CPI_SNAPSHOT.referencePeriod}, compared with {CPI_SNAPSHOT.previousValue.toFixed(1)}% in {CPI_SNAPSHOT.previousPeriod}.</p>
          <table className="mt-5 w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Annual Consumer Price Index changes in the local prototype snapshot</caption>
            <thead><tr className="border-b border-line-soft text-text-dim"><th className="py-3 pr-4">Reference period</th><th className="py-3 pr-4">Annual change</th><th className="py-3">Status</th></tr></thead>
            <tbody>{indicatorRows.map((row) => <tr key={row.period} className="border-b border-line-soft/60"><td className="py-3 pr-4 font-bold text-text-primary">{row.period}</td><td className="py-3 pr-4 text-text-primary">{row.annualChange.toFixed(1)}%</td><td className="py-3 text-text-muted">{row.status}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

