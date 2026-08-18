import { useState } from 'react';
import { Link } from 'react-router-dom';
import { standardDebtPayoff } from '../../lib/debtMath';
import { useReveal } from '../../lib/useReveal';
import { formatCurrencyAUD as formatCurrency, parsePositive, simulateMinimumPayments } from './toolMath';

const CreditCardPayoff = () => {
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Every field is validated with Number.isFinite (via parsePositive): an
    // empty APR used to parse to NaN, sail past a `<= 0` guard and silently
    // become a 0% loan.
    const B = parsePositive(balance);
    const aprNum = parsePositive(apr);
    const P = parsePositive(monthlyPayment);

    if (B === null || aprNum === null || P === null) {
      setResult({ error: 'Please enter valid values for all fields.' });
      return;
    }

    // Core payoff math is shared with the backend debt engine via src/lib/debtMath.js
    // (kept in sync by parity tests on both sides).
    const { months, totalPaid, totalInterest, neverPayoff } = standardDebtPayoff({
      balance: B,
      annualRate: aprNum,
      monthlyPayment: P,
    });
    if (neverPayoff) {
      setResult({ error: 'Monthly payment is too low to cover interest — the balance will never be paid off. Increase your payment.' });
      return;
    }
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    // Minimum payment comparison (typically 2% of the balance or $25, whichever
    // is greater). At high APRs that minimum never amortises the debt; instead
    // of truncating at 1200 months and quoting a bogus saving, say so.
    const minPayment = Math.max(25, B * 0.02);
    const minimum = simulateMinimumPayments({ balance: B, annualRate: aprNum });
    if (minimum.neverAmortizes) {
      setResult({
        months, years, remMonths, totalPaid, totalInterest, minPayment,
        minimumNeverAmortizes: true,
      });
      return;
    }
    const interestSaved = Math.max(0, minimum.totalInterest - totalInterest);
    const monthsSaved = Math.max(0, minimum.months - months);

    setResult({ months, years, remMonths, totalPaid, totalInterest, minPayment, interestSaved, monthsSaved, minMonths: minimum.months });
  };

  useReveal();

  return (
    <div className="minimal-page !min-h-0 pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Tools &rarr; Debt & Loans</span>
              <h1 className="minimal-page-title">Credit Card Payoff.</h1>
              <p className="minimal-page-description">
                See exactly how long it takes to clear your balance, and how much interest you save by paying more.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Debt Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cc-balance" className="text-sm font-semibold text-text-dim mb-3 block">Current Balance (AUD)</label>
                <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input
                    id="cc-balance" type="number" min="0" step="100" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00"
                    data-control-unstyled
                    className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <label htmlFor="cc-apr" className="text-sm font-semibold text-text-dim mb-3 block">Annual Interest Rate (APR %)</label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      id="cc-apr" aria-describedby="cc-apr-hint" type="number" min="0" max="100" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="19.9"
                      data-control-unstyled
                      className="w-full bg-transparent pl-4 pr-9 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p id="cc-apr-hint" className="text-xs text-text-dim mt-2">AU avg is roughly 19 to 20%.</p>
                </div>
                <div>
                  <label htmlFor="cc-monthly" className="text-sm font-semibold text-text-dim mb-3 block">Monthly Payment (AUD)</label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                    <input
                      id="cc-monthly" type="number" min="0" step="10" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="0"
                      data-control-unstyled
                      className="w-full bg-transparent pl-8 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary press w-full py-5 text-sm press">Calculate Payoff</button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Payoff Projection</h2>
            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-3">Time to Pay Off</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                      {result.years > 0 ? `${result.years}y ` : ''}{result.remMonths > 0 ? `${result.remMonths}m` : result.years === 0 ? `${result.months}m` : ''}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-raised p-6 space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">Total Paid</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalPaid)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Interest Cost</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                      </div>
                    </div>
                    {result.minimumNeverAmortizes ? (
                      <div className="pt-6 border-t border-line-soft">
                        <p className="text-xs font-semibold text-text-dim mb-2">Versus minimum payments</p>
                        <p className="text-sm font-semibold text-accent">
                          At this interest rate the {formatCurrency(result.minPayment)}/mo minimum never clears the balance.
                        </p>
                        <p className="text-xs text-text-dim mt-1">The 2% minimum stops covering the interest charged, so the debt would stay with you indefinitely. Any payment above it is what actually pays it down.</p>
                      </div>
                    ) : result.interestSaved > 0 && (
                      <div className="pt-6 border-t border-line-soft">
                        <p className="text-xs font-semibold text-text-dim mb-2">Versus minimum payments</p>
                        <p className="text-sm font-semibold text-accent">
                          Save {formatCurrency(result.interestSaved)} and {result.monthsSaved} months
                        </p>
                        <p className="text-xs text-text-dim mt-1">By paying {formatCurrency(parseFloat(monthlyPayment))} instead of about {formatCurrency(result.minPayment)}/mo minimum.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center text-sm font-display font-extrabold mb-6">CC</div>
                <p className="text-sm font-medium text-text-muted">Enter your balance and payment details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardPayoff;
