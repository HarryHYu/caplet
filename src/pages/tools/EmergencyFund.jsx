import { useState } from 'react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Risk Management</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Emergency <br />Fund.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Analyze your capital resilience and define the necessary liquidity buffer for unexpected transitions.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-xs uppercase tracking-widest px-8">
              &larr; Back to Instruments
            </Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Reserve Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Critical Monthly Burn Rate (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
                <p className="text-[10px] font-medium text-text-dim mt-4 uppercase tracking-widest">
                  Includes: Shelter, sustenance, and mandatory liabilities.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Sustainability Window
                </label>
                <select
                  value={monthsCoverage}
                  onChange={(e) => setMonthsCoverage(e.target.value)}
                  className="w-full bg-surface-raised border border-line-soft px-6 py-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-accent appearance-none cursor-pointer"
                >
                  <option value="3">3 Months (Standard)</option>
                  <option value="6">6 Months (Recommended)</option>
                  <option value="9">9 Months (Conservative)</option>
                  <option value="12">12 Months (Maximum)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Liquid Assets at Registry
                </label>
                <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Analyze Resilience
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Resilience Analysis</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Target Liquid Reserve</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.recommended)}
                    </p>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-4">
                      Protocol: {result.months} Cycles @ {formatCurrency(result.monthlyExpenses)} / Cycle
                    </p>
                  </div>

                  {result.current > 0 && (
                    <div className="pt-10 border-t border-line-soft space-y-10">
                      <div>
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4">Saturation Level</p>
                        <div className="flex items-end justify-between mb-3">
                          <p className="text-2xl font-bold">{formatCurrency(result.current)}</p>
                          <p className="text-xs font-bold text-accent">{result.percentage.toFixed(1)}%</p>
                        </div>
                        <div className="w-full bg-surface-soft h-1.5 overflow-hidden">
                          <div
                            className="bg-accent h-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, result.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {result.shortfall > 0 ? (
                        <div>
                          <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-2 font-serif italic">Capital Shortfall</p>
                          <p className="text-xl font-bold text-text-primary">{formatCurrency(result.shortfall)}</p>
                        </div>
                      ) : (
                        <div className="p-8 bg-accent/5 border border-accent/20">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest">
                            ✓ Target Saturation Achieved
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-12 border-t border-line-soft space-y-6">
                    {[
                      'Prioritize immediate liquidity',
                      'Exclude non-essential consumption',
                      'Recalibrate per life stage shift'
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">
                        <div className="w-1 h-1 bg-accent" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-4xl font-serif italic mb-8">!</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Economic Data Missing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyFund;

