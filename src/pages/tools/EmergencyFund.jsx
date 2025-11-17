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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wide mb-2">
                  Caplet Tools
                </p>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Emergency Fund Calculator
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                  Calculate how much you should have in your emergency fund to cover unexpected expenses.
                </p>
              </div>
              <Link to="/tools" className="text-sm text-blue-600 dark:text-blue-300 hover:underline">
                ← Back to tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Enter your details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Essential Expenses
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    placeholder="e.g. 3000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Include rent, food, utilities, insurance, minimum debt payments
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Months of Coverage
                  </label>
                  <select
                    value={monthsCoverage}
                    onChange={(e) => setMonthsCoverage(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="3">3 months (minimum)</option>
                    <option value="6">6 months (recommended)</option>
                    <option value="9">9 months (conservative)</option>
                    <option value="12">12 months (very conservative)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Emergency Savings (optional)
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Recommended Emergency Fund</p>
                      <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.recommended)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ({result.months} months × {formatCurrency(result.monthlyExpenses)})
                      </p>
                    </div>
                    {result.current > 0 && (
                      <>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Current Savings</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                            {formatCurrency(result.current)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {result.percentage.toFixed(1)}% of goal
                          </p>
                        </div>
                        {result.shortfall > 0 ? (
                          <div className="break-words">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Shortfall</p>
                            <p className="text-lg font-semibold text-red-600 dark:text-red-400 break-words overflow-wrap-anywhere">
                              {formatCurrency(result.shortfall)}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              ✓ You have enough saved!
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>• Emergency fund should cover essential expenses only</p>
                      <p>• Keep in a high-interest savings account</p>
                      <p>• Reassess when expenses change</p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your monthly expenses to see recommended emergency fund amount.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmergencyFund;

