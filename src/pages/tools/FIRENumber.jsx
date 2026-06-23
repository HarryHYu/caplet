import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const FIRENumber = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [withdrawalRate, setWithdrawalRate] = useState('4');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ME = parseFloat(monthlyExpenses) || 0;
    const WR = parseFloat(withdrawalRate) / 100;
    const CS = parseFloat(currentSavings) || 0;
    const MC = parseFloat(monthlyContribution) || 0;
    const AR = parseFloat(annualReturn) / 100;

    if (ME <= 0 || WR <= 0) {
      setResult({ error: 'Please enter valid monthly expenses and withdrawal rate.' });
      return;
    }

    const annualExpenses = ME * 12;
    const fireNumber = annualExpenses / WR;
    const remaining = Math.max(0, fireNumber - CS);

    let yearsToFIRE = null;
    if (MC > 0 && AR > 0 && remaining > 0) {
      const monthlyRate = AR / 12;
      // FV = CS*(1+r)^n + MC*((1+r)^n - 1)/r = fireNumber
      // Solve numerically (binary search)
      let lo = 0, hi = 1200;
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        const fv = CS * Math.pow(1 + monthlyRate, mid) + MC * (Math.pow(1 + monthlyRate, mid) - 1) / monthlyRate;
        if (fv < fireNumber) lo = mid; else hi = mid;
      }
      yearsToFIRE = hi / 12;
    } else if (CS >= fireNumber) {
      yearsToFIRE = 0;
    }

    const savingsRate = MC > 0 && (ME + MC) > 0 ? (MC / (ME + MC)) * 100 : null;

    setResult({ annualExpenses, fireNumber, remaining, yearsToFIRE, WR, savingsRate });
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Wealth & Investing</span>
              <h1 className="text-6xl md:text-8xl mb-8">FIRE<br />Number.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Calculate how much you need to retire — and how long until you get there.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Retirement Target</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Expenses in Retirement</label>
                    <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                      <input type="number" min="0" step="100" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Safe Withdrawal Rate</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="1" max="10" step="0.1" value={withdrawalRate} onChange={(e) => setWithdrawalRate(e.target.value)} placeholder="4"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                    <p className="text-xs text-text-dim mt-2 italic">The 4% rule is the standard benchmark</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Your Current Situation (optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Current Savings / Investments</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input type="number" min="0" step="1000" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Contributions</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input type="number" min="0" step="100" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Expected Annual Return</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="0" max="30" step="0.1" value={annualReturn} onChange={(e) => setAnnualReturn(e.target.value)} placeholder="7"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                    <p className="text-xs text-text-dim mt-2 italic">ASX 200 long-run avg ≈ 7–8%</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate FIRE Number</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">FIRE Projection</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-4 italic">Your FIRE Number</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">{formatCurrency(result.fireNumber)}</p>
                    <p className="text-xs text-text-dim mt-2 italic">At {(result.WR * 100).toFixed(1)}% withdrawal rate</p>
                  </div>
                  <div className="pt-10 border-t border-line-soft space-y-8">
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
                      <div className="pt-8 border-t border-line-soft">
                        <p className="text-xs font-medium text-text-dim mb-2">Years to FIRE</p>
                        <p className="text-3xl font-black">
                          {result.yearsToFIRE === 0 ? "You're there!" : `${result.yearsToFIRE.toFixed(1)} years`}
                        </p>
                        {result.savingsRate !== null && (
                          <p className="text-xs text-text-dim mt-1 italic">Savings rate: {result.savingsRate.toFixed(0)}%</p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-serif italic text-text-dim leading-relaxed pt-4 border-t border-line-soft">
                    FIRE = Financial Independence, Retire Early. Returns are not guaranteed; this is a projection only.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">FI</div>
                <p className="text-sm font-medium">Enter your expenses to calculate your number</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FIRENumber;
