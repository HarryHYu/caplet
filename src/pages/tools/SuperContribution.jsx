import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const SuperContribution = () => {
  const [currentBalance, setCurrentBalance] = useState('');
  const [salary, setSalary] = useState('');
  const [employerContribution, setEmployerContribution] = useState('11');
  const [personalContribution, setPersonalContribution] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const balance = parseFloat(currentBalance) || 0;
    const salaryNum = parseFloat(salary) || 0;
    const employerRate = parseFloat(employerContribution) || 0;
    const personalNum = parseFloat(personalContribution) || 0;
    const yearsNum = parseFloat(years) || 0;

    if (yearsNum <= 0) {
      setResult({ error: 'Please enter a valid time period.' });
      return;
    }

    const annualReturn = 0.07;
    const monthlyReturn = annualReturn / 12;
    const numMonths = yearsNum * 12;

    const employerMonthly = (salaryNum * employerRate / 100) / 12;
    const totalMonthlyContribution = employerMonthly + (personalNum / 12);

    let futureBalance = balance;
    for (let i = 0; i < numMonths; i++) {
      futureBalance = futureBalance * (1 + monthlyReturn) + totalMonthlyContribution;
    }

    const totalContributions = balance + (employerMonthly * numMonths * 12) + (personalNum * yearsNum);
    const growth = futureBalance - totalContributions;

    setResult({
      futureBalance,
      totalContributions,
      growth,
      employerTotal: employerMonthly * numMonths * 12,
      personalTotal: personalNum * yearsNum,
      years: yearsNum,
    });
  };

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Retirement</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Legacy <br />Architecture.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Project your superannuation maturity and optimize contribution discipline for long-term equity.
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
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Contribution Inputs</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Opening Balance (AUD)
                  </label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={currentBalance}
                      onChange={(e) => setCurrentBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Annual Salary
                  </label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Employer Rate (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={employerContribution}
                      onChange={(e) => setEmployerContribution(e.target.value)}
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Temporal Window
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Annual Personal Top-up (Optional)
                </label>
                <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={personalContribution}
                    onChange={(e) => setPersonalContribution(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Confirm Legacy Logic
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Maturity Projection</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Projected Portfolio Value</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.futureBalance)}
                    </p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mt-4">Horizon: {result.years} annual cycles</p>
                  </div>

                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Total Contributions</p>
                      <p className="text-xl font-bold">{formatCurrency(result.totalContributions)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-line-soft border border-line-soft">
                      <div className="bg-surface-body p-6">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Employer</p>
                        <p className="text-lg font-bold">{formatCurrency(result.employerTotal)}</p>
                      </div>
                      <div className="bg-surface-body p-6">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Personal</p>
                        <p className="text-lg font-bold">{formatCurrency(result.personalTotal)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-end text-accent pt-4">
                      <p className="text-[9px] font-bold uppercase tracking-widest">Investment Growth</p>
                      <p className="text-2xl font-black">{formatCurrency(result.growth)}</p>
                    </div>

                    <div className="pt-8 border-t border-line-soft text-[10px] text-text-dim space-y-2 opacity-60 uppercase tracking-widest font-bold">
                      <p>• Projected 7% Annual Yield</p>
                      <p>• Temporal Asset Allocation Logic</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">FUND</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Awaiting Portfolio Inputs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperContribution;

