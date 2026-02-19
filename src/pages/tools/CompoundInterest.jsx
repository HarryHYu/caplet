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
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Growth</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Compound <br />Architecture.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Visualize the exponential mechanics of your capital over defined temporal windows.
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
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Growth Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Opening Principal (AUD)
                  </label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Monthly Injection
                  </label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Annual Yield (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Time Horizon
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Confirm Growth Logic
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Economic Projection</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Maturity Balance</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.finalBalance)}
                    </p>
                  </div>

                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Total Injected</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalContributions)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Accrued Interest</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.interestEarned)}</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 font-serif italic">Compounded Statistics</p>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-text-primary">{result.years} Year Horizon</span>
                        <div className="w-px h-3 bg-line-soft" />
                        <span className="text-text-muted">{((result.interestEarned / result.finalBalance) * 100 || 0).toFixed(1)}% Interest</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-line-soft">
                    <p className="text-[10px] font-serif italic text-text-dim leading-relaxed">
                      "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it."
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">EXP</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Awaiting Economic Inputs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundInterest;

