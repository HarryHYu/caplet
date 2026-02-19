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
    <div className="min-h-screen py-24 page-section-light">
      <section className="border-b border-zinc-100 dark:border-zinc-900 mb-20 pb-20">
        <div className="container-custom">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8 animate-slide-up">
              <div>
                <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-4">
                  Financial Tools
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Emergency Fund <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Calculate how much you should have in your emergency fund to cover unexpected expenses.
                </p>
              </div>
              <Link to="/tools" className="text-[10px] font-black text-zinc-400 hover:text-brand uppercase tracking-widest transition-colors mb-auto">
                ← Back to Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl">
            <div className="lg:col-span-2 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 p-10 reveal-up">
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Reserve Parameters</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Critical Monthly Burn Rate (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    placeholder="E.G. 3000"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-3">
                    Includes: Shelter, sustenance, utilities, and mandatory liabilities.
                  </p>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Sustainability Window
                  </label>
                  <select
                    value={monthsCoverage}
                    onChange={(e) => setMonthsCoverage(e.target.value)}
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  >
                    <option value="3">3 Months (Standard)</option>
                    <option value="6">6 Months (Recommended)</option>
                    <option value="9">9 Months (Conservative)</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Current Liquid Liquidity (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    placeholder="E.G. 5000"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all active:scale-[0.98] mt-4"
                >
                  Analyze Resilience
                </button>
              </form>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 reveal-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Reserve Analysis</h2>
              {result ? (
                result.error ? (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{result.error}</p>
                ) : (
                  <div className="space-y-10">
                    <div>
                      <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1 italic">Target Reserve Capital</p>
                      <p className="text-3xl font-extrabold text-brand tracking-tighter">
                        {formatCurrency(result.recommended)}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
                        Window: {result.months} Cycles × {formatCurrency(result.monthlyExpenses)}
                      </p>
                    </div>
                    {result.current > 0 && (
                      <>
                        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
                          <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Liquid Status</p>
                            <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                              {formatCurrency(result.current)}
                            </p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2 italic">
                              {result.percentage.toFixed(1)}% Saturation
                            </p>
                          </div>
                          {result.shortfall > 0 ? (
                            <div>
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Capital Shortfall</p>
                              <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                                {formatCurrency(result.shortfall)}
                              </p>
                            </div>
                          ) : (
                            <div className="p-6 bg-brand/5 border border-brand/20">
                              <p className="text-[9px] font-black text-brand uppercase tracking-widest">
                                ✓ Target Saturation Achieved
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <div className="mt-4 pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <div className="w-1 h-1 bg-brand" />
                        Focus on critical liabilities only
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <div className="w-1 h-1 bg-brand" />
                        Maintain in immediate liquidity
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <div className="w-1 h-1 bg-brand" />
                        Recalibrate per life cycle shifts
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <span className="w-1.5 h-1.5 bg-zinc-200 dark:bg-zinc-800 mb-4" />
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                    Enter values to calculate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmergencyFund;

