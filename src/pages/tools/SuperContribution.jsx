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
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-2xl block mb-4">Plan your future</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6 text-text-primary">
                Super Contribution Planner
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Project your superannuation balance and see how steady contributions build long-term equity.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">
              Back to tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-8 lg:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Contribution Inputs</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-2 block">
                    Opening Balance (AUD)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={currentBalance}
                      onChange={(e) => setCurrentBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-9 pr-4 py-3 text-xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-text-dim mb-2 block">
                    Annual Salary
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-9 pr-4 py-3 text-xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-2 block">
                    Employer Rate (%)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={employerContribution}
                      onChange={(e) => setEmployerContribution(e.target.value)}
                      className="w-full bg-transparent pl-4 pr-9 py-3 text-lg font-bold text-text-primary outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-text-dim mb-2 block">
                    Time Horizon
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-text-dim mb-2 block">
                  Annual Personal Top-up (Optional)
                </label>
                <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={personalContribution}
                    onChange={(e) => setPersonalContribution(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-9 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-4 hover:-translate-y-0.5 transition-transform">
                Calculate Projection
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-8 lg:p-12 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-10">Maturity Projection</h2>

            {result ? (
              result.error ? (
                <p className="text-sm font-semibold text-accent">{result.error}</p>
              ) : (
                <div className="space-y-10">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-3">Projected Portfolio Value</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                      {formatCurrency(result.futureBalance)}
                    </p>
                    <p className="text-xs font-medium text-text-muted mt-3">Over {result.years} years</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-semibold text-text-dim">Total Contributions</p>
                      <p className="text-xl font-bold text-text-primary">{formatCurrency(result.totalContributions)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-raised rounded-2xl p-5">
                        <p className="text-xs font-semibold text-text-dim mb-1">Employer</p>
                        <p className="text-lg font-bold text-text-primary">{formatCurrency(result.employerTotal)}</p>
                      </div>
                      <div className="bg-surface-raised rounded-2xl p-5">
                        <p className="text-xs font-semibold text-text-dim mb-1">Personal</p>
                        <p className="text-lg font-bold text-text-primary">{formatCurrency(result.personalTotal)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-end text-accent">
                      <p className="text-xs font-semibold">Investment Growth</p>
                      <p className="text-2xl font-extrabold">{formatCurrency(result.growth)}</p>
                    </div>

                    <div className="text-xs text-text-dim space-y-2 font-medium pt-2">
                      <p>Assumes 7% annual return</p>
                      <p>Compounded monthly across your time horizon</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-sm font-bold font-display text-accent mb-6">$</div>
                <p className="text-sm font-medium text-text-muted">Enter your details to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperContribution;

