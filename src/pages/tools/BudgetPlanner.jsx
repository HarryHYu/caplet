import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const BudgetPlanner = () => {
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState({
    housing: '',
    food: '',
    transport: '',
    utilities: '',
    insurance: '',
    entertainment: '',
    savings: '',
    other: '',
  });
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const incomeNum = parseFloat(income) || 0;
    const expenseValues = Object.values(expenses).map(v => parseFloat(v) || 0);
    const totalExpenses = expenseValues.reduce((sum, val) => sum + val, 0);
    const remaining = incomeNum - totalExpenses;
    const savingsRate = incomeNum > 0 ? (expenses.savings / incomeNum) * 100 : 0;

    setResult({
      income: incomeNum,
      totalExpenses,
      remaining,
      savingsRate,
      breakdown: Object.entries(expenses).map(([key, value]) => ({
        category: key.charAt(0).toUpperCase() + key.slice(1),
        amount: parseFloat(value) || 0,
        percentage: incomeNum > 0 ? ((parseFloat(value) || 0) / incomeNum) * 100 : 0,
      })),
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
                  Budget Planner
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                  Plan your monthly budget and track your spending across different categories.
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Enter your budget</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Income
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">Monthly Expenses</h3>
                  {Object.keys(expenses).map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={expenses[key]}
                        onChange={(e) => setExpenses({ ...expenses, [key]: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold transition-colors mt-6"
                >
                  Calculate Budget
                </button>
              </form>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
              {result ? (
                <div className="space-y-4">
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                      {formatCurrency(result.income)}
                    </p>
                  </div>
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                    <p className="text-2xl font-semibold text-red-600 dark:text-red-400 break-words overflow-wrap-anywhere">
                      {formatCurrency(result.totalExpenses)}
                    </p>
                  </div>
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {result.remaining >= 0 ? 'Remaining' : 'Overspent'}
                    </p>
                    <p className={`text-2xl font-semibold break-words overflow-wrap-anywhere ${
                      result.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(Math.abs(result.remaining))}
                    </p>
                  </div>
                  {result.savingsRate > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Savings Rate</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {result.savingsRate.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Breakdown</p>
                    <div className="space-y-2">
                      {result.breakdown.map((item) => (
                        item.amount > 0 && (
                          <div key={item.category} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{item.category}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your income and expenses to see your budget summary.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BudgetPlanner;

