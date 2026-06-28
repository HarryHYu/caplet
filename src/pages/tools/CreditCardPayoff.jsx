import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const CreditCardPayoff = () => {
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const B = parseFloat(balance) || 0;
    const r = parseFloat(apr) / 100 / 12;
    const P = parseFloat(monthlyPayment) || 0;

    if (B <= 0 || parseFloat(apr) <= 0 || P <= 0) {
      setResult({ error: 'Please enter valid values for all fields.' });
      return;
    }
    if (P <= B * r) {
      setResult({ error: 'Monthly payment is too low to cover interest — the balance will never be paid off. Increase your payment.' });
      return;
    }

    const months = Math.ceil(-Math.log(1 - (B * r) / P) / Math.log(1 + r));
    const totalPaid = P * months;
    const totalInterest = totalPaid - B;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    // Minimum payment comparison (typically 2% of balance or $25, whichever is greater)
    const minPayment = Math.max(25, B * 0.02);
    let minMonths = 0;
    let minTotalPaid = 0;
    let runningBalance = B;
    while (runningBalance > 0 && minMonths < 1200) {
      const mp = Math.min(Math.max(25, runningBalance * 0.02), runningBalance * (1 + r));
      const interest = runningBalance * r;
      runningBalance = runningBalance + interest - mp;
      minTotalPaid += mp;
      minMonths++;
    }
    const minTotalInterest = minTotalPaid - B;
    const interestSaved = Math.max(0, minTotalInterest - totalInterest);
    const monthsSaved = Math.max(0, minMonths - months);

    setResult({ months, years, remMonths, totalPaid, totalInterest, minPayment, interestSaved, monthsSaved, minMonths });
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Debt & Loans</span>
              <h1 className="text-6xl md:text-8xl mb-8">Credit Card<br />Payoff.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Calculate exactly how long it takes to clear your balance — and how much interest you can save by paying more.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-sm font-semibold text-text-muted mb-16">Debt Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-4 block italic">Current Balance (AUD)</label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number" min="0" step="100" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Annual Interest Rate (APR %)</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number" min="0" max="100" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="19.9"
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p className="text-xs text-text-dim mt-2 italic">AU avg ≈ 19–20%</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Payment (AUD)</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                    <input
                      type="number" min="0" step="10" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="0"
                      className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate Payoff</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Payoff Projection</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-4 italic">Time to Pay Off</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {result.years > 0 ? `${result.years}y ` : ''}{result.remMonths > 0 ? `${result.remMonths}m` : result.years === 0 ? `${result.months}m` : ''}
                    </p>
                  </div>
                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-1">Total Paid</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalPaid)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-text-dim mb-1">Interest Cost</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                      </div>
                    </div>
                    {result.interestSaved > 0 && (
                      <div className="pt-8 border-t border-line-soft">
                        <p className="text-xs font-medium text-text-dim mb-2 italic">vs. minimum payments</p>
                        <p className="text-sm font-semibold text-accent">
                          Save {formatCurrency(result.interestSaved)} and {result.monthsSaved} months
                        </p>
                        <p className="text-xs text-text-dim mt-1">by paying {formatCurrency(parseFloat(monthlyPayment))} instead of ~{formatCurrency(result.minPayment)}/mo minimum</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">CC</div>
                <p className="text-sm font-medium">Enter your balance and payment details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardPayoff;
