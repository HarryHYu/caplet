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
                  Budget <br />Planner.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Plan your monthly budget and track spending across different categories.
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
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Budget Input</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Monthly Income (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="E.G. 5000"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-brand uppercase tracking-widest mt-12 mb-6">Monthly Expenses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(expenses).map((key) => (
                      <div key={key}>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 italic">
                          {key}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={expenses[key]}
                          onChange={(e) => setExpenses({ ...expenses, [key]: e.target.value })}
                          placeholder="0"
                          className="w-full px-5 py-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-bold text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all active:scale-[0.98] mt-10"
                >
                  Calculate Budget
                </button>
              </form>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 reveal-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Budget Summary</h2>
              {result ? (
                <div className="space-y-10">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Total Income</p>
                    <p className="text-2xl font-extrabold text-black dark:text-white tracking-tighter">
                      {formatCurrency(result.income)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Total Expenses</p>
                    <p className="text-2xl font-extrabold text-black dark:text-white tracking-tighter">
                      {formatCurrency(result.totalExpenses)}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1 italic">
                      {result.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                    </p>
                    <p className={`text-3xl font-extrabold tracking-tighter ${result.remaining >= 0 ? 'text-brand' : 'text-black dark:text-white'
                      }`}>
                      {formatCurrency(Math.abs(result.remaining))}
                    </p>
                  </div>

                  {result.savingsRate > 0 && (
                    <div className="p-6 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Savings Rate</p>
                      <p className="text-xl font-extrabold text-brand tracking-tighter">
                        {result.savingsRate.toFixed(1)}%
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-6">Expense Breakdown</p>
                    <div className="space-y-4">
                      {result.breakdown.map((item) => (
                        item.amount > 0 && (
                          <div key={item.category} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">{item.category}</span>
                            <span className="text-black dark:text-white">
                              {formatCurrency(item.amount)} <span className="text-[8px] text-zinc-400">[{item.percentage.toFixed(1)}%]</span>
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
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

export default BudgetPlanner;

