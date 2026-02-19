import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const CompoundInterest = () => {
  const [principal, setPrincipal] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const principalNum = parseFloat(principal) || 0;
    const monthlyNum = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(interestRate) || 0;
    const yearsNum = parseFloat(years) || 0;

    if (rate <= 0 || yearsNum <= 0) {
      setResult({ error: 'Please enter valid interest rate and time period.' });
      return;
    }

    const monthlyRate = rate / 100 / 12;
    const numMonths = yearsNum * 12;

    // Future value with compound interest and regular contributions
    // FV = PV(1+r)^n + PMT[((1+r)^n - 1)/r]
    const futureValuePrincipal = principalNum * Math.pow(1 + monthlyRate, numMonths);
    const futureValueContributions = monthlyNum > 0
      ? monthlyNum * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate)
      : 0;

    const finalBalance = futureValuePrincipal + futureValueContributions;
    const totalContributions = principalNum + (monthlyNum * numMonths);
    const interestEarned = finalBalance - totalContributions;

    setResult({
      finalBalance,
      totalContributions,
      interestEarned,
      years: yearsNum,
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
                  Compound Interest <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  See how your money grows with compound interest and regular contributions.
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
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Input Values</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Starting Amount (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="E.G. 10000"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Monthly Contribution
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="E.G. 500"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                      Expected Annual Yield (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="E.G. 7.5"
                      className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                      Time Horizon (Years)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="E.G. 20"
                      className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all active:scale-[0.98] mt-4"
                >
                  Calculate
                </button>
              </form>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 reveal-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Yield Metrics</h2>
              {result ? (
                result.error ? (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{result.error}</p>
                ) : (
                  <div className="space-y-10">
                    <div>
                      <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1 italic">Projected Maturity</p>
                      <p className="text-3xl font-extrabold text-brand tracking-tighter">
                        {formatCurrency(result.finalBalance)}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Maturity Window: {result.years} Cycles</p>
                    </div>

                    <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Total Capital Injected</p>
                        <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                          {formatCurrency(result.totalContributions)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Compounded Yield</p>
                        <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                          {formatCurrency(result.interestEarned)}
                        </p>
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

export default CompoundInterest;

