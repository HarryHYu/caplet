import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { compoundGrowth, formatCurrencyAUD as formatCurrency, parseNonNegative, parsePositive } from './toolMath';

const CompoundInterest = () => {
  const [principal, setPrincipal] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const principalNum = parseNonNegative(principal) ?? 0;
    const monthlyNum = parseNonNegative(monthlyContribution) ?? 0;
    // 0% is a legitimate rate ("what if my savings earn nothing?"), so it is
    // accepted and handled by the linear branch in compoundGrowth.
    const rate = parseNonNegative(interestRate);
    const yearsNum = parsePositive(years);

    if (rate === null || yearsNum === null) {
      setResult({ error: 'Please enter a valid interest rate (0 or more) and time period.' });
      return;
    }

    setResult(compoundGrowth({
      principal: principalNum,
      monthly: monthlyNum,
      annualRate: rate,
      years: yearsNum,
    }));
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="mb-3 font-hand text-lg text-accent -rotate-2 inline-block">Watch your money grow</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6">
                Compound <br />Interest.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                See how your savings grow with <span className="hl-swipe hl-blue">compounding</span> over time.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8 press">
              &larr; Back to tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Growth Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <label htmlFor="ci-principal" className="text-sm font-semibold text-text-dim mb-3 block">
                    Starting Amount (AUD)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      id="ci-principal"
                      type="number"
                      min="0"
                      step="100"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-9 pr-4 py-3 text-xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ci-monthly" className="text-sm font-semibold text-text-dim mb-3 block">
                    Monthly Contribution
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      id="ci-monthly"
                      type="number"
                      min="0"
                      step="50"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-9 pr-4 py-3 text-xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="ci-rate" className="text-sm font-semibold text-text-dim mb-3 block">
                    Annual Interest Rate (%)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      id="ci-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent pl-4 pr-9 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="ci-years" className="text-sm font-semibold text-text-dim mb-3 block">
                    Time Horizon
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      id="ci-years"
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary press w-full py-4 mt-2 press">
                Calculate Growth
              </button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Your Projection</h2>

            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="animate-rise space-y-10">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-3">Final Balance</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                      {formatCurrency(result.finalBalance)}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end gap-4">
                      <div className="bg-surface-raised rounded-2xl px-5 py-4 flex-1">
                        <p className="text-xs font-semibold text-text-dim mb-1">Total Contributed</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalContributions)}</p>
                      </div>
                      <div className="bg-surface-raised rounded-2xl px-5 py-4 flex-1 text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Interest Earned</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.interestEarned)}</p>
                      </div>
                    </div>

                    <div className="bg-surface-raised rounded-2xl px-5 py-4">
                      <p className="text-xs font-semibold text-text-dim mb-3">The Breakdown</p>
                      <div className="flex items-center gap-4 text-sm font-semibold">
                        <span className="text-text-primary">{result.years} year horizon</span>
                        <div className="w-px h-3 bg-line-soft" />
                        <span className="text-text-muted">{((result.interestEarned / result.finalBalance) * 100 || 0).toFixed(1)}% interest</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-serif italic text-text-muted leading-relaxed">
                    "Compound interest is the eighth wonder of the world. Those who understand it, earn it. Those who don't, pay it."
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-2xl mb-6 shadow-pop">
                  &#128200;
                </div>
                <p className="text-sm font-medium text-text-muted">Enter your details to see your results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundInterest;

