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

    // Assume 7% annual return (conservative estimate)
    const annualReturn = 0.07;
    const monthlyReturn = annualReturn / 12;
    const numMonths = yearsNum * 12;

    const employerMonthly = (salaryNum * employerRate / 100) / 12;
    const totalMonthlyContribution = employerMonthly + (personalNum / 12);

    // Future value with compound interest and regular contributions
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
                  Super Contribution <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Long-horizon projections for employer and personal super contributions.
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
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Contribution Inputs</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Super Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Salary
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. 80000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employer Contribution Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={employerContribution}
                    onChange={(e) => setEmployerContribution(e.target.value)}
                    placeholder="e.g. 11"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard is 11% (2023-24)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Personal Contribution (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={personalContribution}
                    onChange={(e) => setPersonalContribution(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Period (years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Calculate
                </button>
              </form>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Results</h2>
              {result ? (
                result.error ? (
                  <p className="text-red-600 dark:text-red-400 text-sm">{result.error}</p>
                ) : (
                  <div className="space-y-4">
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Projected Balance</p>
                      <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.futureBalance)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">After {result.years} years</p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Contributions</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.totalContributions)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Employer</p>
                        <p className="text-gray-900 dark:text-white font-medium break-words overflow-wrap-anywhere">
                          {formatCurrency(result.employerTotal)}
                        </p>
                      </div>
                      {result.personalTotal > 0 && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Personal</p>
                          <p className="text-gray-900 dark:text-white font-medium break-words overflow-wrap-anywhere">
                            {formatCurrency(result.personalTotal)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Investment Growth</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.growth)}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                      <p>• Assumes 7% annual return</p>
                      <p>• For educational purposes only</p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your super details to see projected balance.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperContribution;

