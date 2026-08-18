import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { fireProjection, formatCurrencyAUD as formatCurrency, parseNonNegative, parsePositive } from './toolMath';

const FIRENumber = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [withdrawalRate, setWithdrawalRate] = useState('4');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Every field goes through a Number.isFinite parse. An empty withdrawal
    // rate used to become NaN, slip past the `<= 0` guard and render "$NaN".
    const ME = parsePositive(monthlyExpenses);
    const WR = parsePositive(withdrawalRate);
    const CS = parseNonNegative(currentSavings) ?? 0;
    const MC = parseNonNegative(monthlyContribution) ?? 0;
    const AR = parseNonNegative(annualReturn) ?? 0;

    if (ME === null || WR === null) {
      setResult({ error: 'Please enter valid monthly expenses and withdrawal rate.' });
      return;
    }

    const projection = fireProjection({
      monthlyExpenses: ME,
      withdrawalRate: WR,
      currentSavings: CS,
      monthlyContribution: MC,
      annualReturn: AR / 100,
    });

    setResult({ ...projection, WR: WR / 100 });
  };

  useReveal();

  return (
    <div className="minimal-page pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Wealth and investing</span>
              <h1 className="minimal-page-title">FIRE Number.</h1>
              <p className="minimal-page-description">
                Calculate how much you need to retire, and how long until you get there.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8 press">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-6">Retirement Target</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fire-monthly-expenses" className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Expenses in Retirement</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                      <input id="fire-monthly-expenses" type="number" min="0" step="100" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} placeholder="0.00"
                        data-control-unstyled
                        className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fire-withdrawal-rate" className="text-sm font-semibold text-text-dim mb-4 block italic">Safe Withdrawal Rate</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="fire-withdrawal-rate" type="number" min="1" max="10" step="0.1" value={withdrawalRate} onChange={(e) => setWithdrawalRate(e.target.value)} placeholder="4"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                    <p className="text-xs text-text-dim mt-2 italic">The 4% rule is the standard benchmark</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-6">Your Current Situation (optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label htmlFor="fire-current-savings" className="text-sm font-semibold text-text-dim mb-4 block italic">Current Savings / Investments</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                      <input id="fire-current-savings" type="number" min="0" step="1000" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="0"
                        data-control-unstyled
                        className="w-full bg-transparent pl-9 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fire-monthly-contribution" className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Contributions</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                      <input id="fire-monthly-contribution" type="number" min="0" step="100" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="0"
                        data-control-unstyled
                        className="w-full bg-transparent pl-9 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fire-annual-return" className="text-sm font-semibold text-text-dim mb-4 block italic">Expected Annual Return</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="fire-annual-return" type="number" min="0" max="30" step="0.1" value={annualReturn} onChange={(e) => setAnnualReturn(e.target.value)} placeholder="7"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                    <p className="text-xs text-text-dim mt-2 italic">ASX 200 long-run average is about 7 to 8%</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary press w-full py-4 text-sm press">Calculate FIRE Number</button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col relative overflow-hidden card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-8 relative z-10">FIRE Projection</h2>
            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-medium text-text-error relative z-10">{result.error}</p>
              ) : (
                <div className="animate-rise space-y-8 relative z-10">
                  <div className="bg-surface-raised rounded-2xl p-8 shadow-pop">
                    <p className="text-xs font-semibold text-text-muted mb-4">Your FIRE Number</p>
                    <p className="text-5xl font-display font-extrabold tracking-tight text-text-primary">{formatCurrency(result.fireNumber)}</p>
                    <p className="text-xs text-text-dim mt-2">At {(result.WR * 100).toFixed(1)}% withdrawal rate</p>
                  </div>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-1">Annual Expenses</p>
                        <p className="text-xl font-bold">{formatCurrency(result.annualExpenses)}</p>
                      </div>
                      {result.remaining > 0 && (
                        <div className="text-right">
                          <p className="text-xs font-medium text-text-dim mb-1">Still Needed</p>
                          <p className="text-xl font-bold text-accent">{formatCurrency(result.remaining)}</p>
                        </div>
                      )}
                    </div>
                    {result.yearsToFIRE !== null && (
                      <div className="bg-surface-raised rounded-2xl p-8 shadow-pop">
                        <p className="text-xs font-semibold text-text-muted mb-2">Years to FIRE</p>
                        <p className="text-3xl font-display font-extrabold tracking-tight">
                          {result.yearsToFIRE === 0 ? "You're there!" : `${result.yearsToFIRE.toFixed(1)} years`}
                        </p>
                        {result.savingsRate !== null && (
                          <p className="text-xs text-text-dim mt-1 italic">Savings rate: {result.savingsRate.toFixed(0)}%</p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-dim leading-relaxed">
                    FIRE = Financial Independence, Retire Early. Returns are not guaranteed; this is a projection only.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center text-sm font-display font-extrabold mb-8 shadow-pop">FI</div>
                <p className="text-sm font-medium text-text-muted">Enter your expenses to calculate your number</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FIRENumber;
