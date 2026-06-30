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
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-lg">Tools &rarr; Debt & Loans</span>
              <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mt-4 mb-8">Credit Card<br />Payoff.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                See exactly how long it takes to clear your balance, and how much interest you save by paying more.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Debt Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-10">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-3 block">Current Balance (AUD)</label>
                <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input
                    type="number" min="0" step="100" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00"
                    className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-3 block">Annual Interest Rate (APR %)</label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      type="number" min="0" max="100" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="19.9"
                      className="w-full bg-transparent pl-4 pr-9 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p className="text-xs text-text-dim mt-2">AU avg is roughly 19 to 20%.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-3 block">Monthly Payment (AUD)</label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                    <input
                      type="number" min="0" step="10" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="0"
                      className="w-full bg-transparent pl-8 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-5 text-sm hover:-translate-y-0.5 transition-transform">Calculate Payoff</button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Payoff Projection</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-semibold text-accent">{result.error}</p>
              ) : (
                <div className="space-y-10">
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
                    {result.interestSaved > 0 && (
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
                <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-sm font-display font-extrabold mb-6">CC</div>
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
