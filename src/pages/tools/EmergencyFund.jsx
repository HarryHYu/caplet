import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const EmergencyFund = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [monthsCoverage, setMonthsCoverage] = useState('6');
  const [currentSavings, setCurrentSavings] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const expenses = parseFloat(monthlyExpenses) || 0;
    const months = parseFloat(monthsCoverage) || 6;
    const current = parseFloat(currentSavings) || 0;

    if (expenses <= 0) {
      setResult({ error: 'Please enter valid monthly expenses.' });
      return;
    }

    const recommended = expenses * months;
    const shortfall = Math.max(0, recommended - current);
    const percentage = current > 0 ? (current / recommended) * 100 : 0;

    setResult({
      recommended,
      current,
      shortfall,
      percentage,
      months,
      monthlyExpenses: expenses,
    });
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-lg block mb-3">Tools / Risk management</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6">
                Emergency <br />Fund.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Analyze your capital resilience and define the liquidity buffer you need for unexpected transitions.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8 hover:-translate-y-0.5 transition-transform">
              Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Reserve Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <label className="text-sm font-bold text-text-dim mb-3 block">
                  Critical Monthly Burn Rate (AUD)
                </label>
                <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-9 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
                <p className="text-xs font-medium text-text-dim mt-3">
                  Includes shelter, food, and mandatory liabilities.
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-text-dim mb-3 block">
                  Sustainability Window
                </label>
                <select
                  value={monthsCoverage}
                  onChange={(e) => setMonthsCoverage(e.target.value)}
                  className="w-full rounded-xl bg-surface-body border border-line-soft px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
                >
                  <option value="3">3 Months (Standard)</option>
                  <option value="6">6 Months (Recommended)</option>
                  <option value="9">9 Months (Conservative)</option>
                  <option value="12">12 Months (Maximum)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-text-dim mb-3 block">
                  Current Savings
                </label>
                <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent pl-9 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-4 mt-2 hover:-translate-y-0.5 transition-transform">
                Analyze Resilience
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Resilience Analysis</h2>

            {result ? (
              result.error ? (
                <p className="text-sm font-bold text-accent">{result.error}</p>
              ) : (
                <div className="space-y-10">
                  <div>
                    <p className="text-xs font-bold text-text-dim mb-3">Target Liquid Reserve</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                      {formatCurrency(result.recommended)}
                    </p>
                    <p className="text-xs font-bold text-text-dim mt-3">
                      Covers {result.months} months at {formatCurrency(result.monthlyExpenses)}
                    </p>
                  </div>

                  {result.current > 0 && (
                    <div className="rounded-2xl bg-surface-raised p-6 space-y-8 shadow-[0_18px_40px_-30px_rgba(20,20,18,0.25)]">
                      <div>
                        <p className="text-xs font-bold text-text-dim mb-4">Saturation Level</p>
                        <div className="flex items-end justify-between mb-3">
                          <p className="text-2xl font-bold">{formatCurrency(result.current)}</p>
                          <p className="text-xs font-bold text-accent">{result.percentage.toFixed(1)}%</p>
                        </div>
                        <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, result.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {result.shortfall > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-text-dim mb-2">Capital Shortfall</p>
                          <p className="text-xl font-bold text-text-primary">{formatCurrency(result.shortfall)}</p>
                        </div>
                      ) : (
                        <div className="rounded-xl p-5 bg-accent/10">
                          <p className="text-sm font-extrabold text-accent">
                            Target saturation achieved
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl bg-surface-raised p-6 space-y-4 shadow-[0_18px_40px_-30px_rgba(20,20,18,0.25)]">
                    {[
                      'Prioritize immediate liquidity',
                      'Exclude non-essential consumption',
                      'Recalibrate per life stage shift'
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm font-medium text-text-dim">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-3xl font-display font-extrabold text-accent mb-6 shadow-[0_18px_40px_-30px_rgba(20,20,18,0.25)]">!</div>
                <p className="text-sm font-bold">Enter your figures to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyFund;

