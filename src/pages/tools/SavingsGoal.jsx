import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const SavingsGoal = () => {
  const [goal, setGoal] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [interestRate, setInterestRate] = useState('3.5');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const goalNum = parseFloat(goal) || 0;
    const currentNum = parseFloat(currentSavings) || 0;
    const monthlyNum = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(interestRate) || 0;

    if (goalNum <= currentNum) {
      setResult({ error: 'Goal amount must be greater than current savings.' });
      return;
    }

    if (monthlyNum <= 0 && rate <= 0) {
      setResult({ error: 'Please enter a monthly contribution or interest rate.' });
      return;
    }

    const monthlyRate = rate / 100 / 12;
    const needed = goalNum - currentNum;
    let months = 0;

    if (monthlyNum > 0) {
      if (rate > 0) {
        // Compound interest formula: FV = PV(1+r)^n + PMT[((1+r)^n - 1)/r]
        // Solving for n: n = log((FV*r + PMT) / (PV*r + PMT)) / log(1+r)
        const numerator = Math.log((goalNum * monthlyRate + monthlyNum) / (currentNum * monthlyRate + monthlyNum));
        const denominator = Math.log(1 + monthlyRate);
        months = Math.ceil(numerator / denominator);
      } else {
        months = Math.ceil(needed / monthlyNum);
      }
    } else {
      // Only interest, no contributions
      months = Math.ceil(Math.log(goalNum / currentNum) / Math.log(1 + monthlyRate));
    }

    const years = months / 12;
    const totalContributed = monthlyNum * months;
    const interestEarned = goalNum - currentNum - totalContributed;

    setResult({
      months,
      years,
      totalContributed,
      interestEarned,
      finalBalance: goalNum,
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
                  Savings Goal <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Time-to-goal projections with regular contributions and compound growth.
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
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Projection Inputs</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Savings Goal
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Savings
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Contribution
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="e.g. 3.5"
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Time to Reach Goal</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {result.months} months
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ({result.years.toFixed(1)} years)
                      </p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Contributions</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.totalContributed)}
                      </p>
                    </div>
                    {result.interestEarned > 0 && (
                      <div className="break-words">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Interest Earned</p>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                          {formatCurrency(result.interestEarned)}
                        </p>
                      </div>
                    )}
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Final Balance</p>
                      <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.finalBalance)}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your savings goal details to see how long it will take to reach it.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SavingsGoal;

