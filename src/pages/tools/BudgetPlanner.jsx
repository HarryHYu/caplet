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
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {/* Header */}
        <header className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-2xl">Plan your money</span>
              <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mt-4 mb-8">
                Budget<br />Planner.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                See your monthly cash flow at a glance and track how you allocate across your main cost centers.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-12">Your budget</h2>

            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-4 block">
                  Net Monthly Income (AUD)
                </label>
                <div className="relative rounded-xl bg-surface-body pl-4 border border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-4 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-6 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {Object.keys(expenses).map((key) => (
                  <div key={key}>
                    <label className="text-sm font-semibold text-text-dim mb-4 block">
                      {key.charAt(0).toUpperCase() + key.slice(1)} Account
                    </label>
                    <div className="relative rounded-xl bg-surface-body pl-3 border border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-3 bottom-2.5 text-text-dim font-bold text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={expenses[key]}
                        onChange={(e) => setExpenses({ ...expenses, [key]: e.target.value })}
                        placeholder="0"
                        className="w-full bg-transparent pl-5 pr-4 py-2.5 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="btn-primary w-full py-5 mt-12 hover:-translate-y-0.5 transition-transform">
                Calculate Budget
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 block-blue rounded-3xl p-12 lg:p-16 flex flex-col min-h-full relative overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-12 relative z-10">Summary</h2>

            {result ? (
              <div className="space-y-12 relative z-10">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-2">Total Income</p>
                    <p className="font-display text-3xl font-bold tracking-tight">{formatCurrency(result.income)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-2">Total Outflow</p>
                    <p className="font-display text-3xl font-bold tracking-tight">{formatCurrency(result.totalExpenses)}</p>
                  </div>
                </div>

                <div className="bg-surface-raised rounded-2xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                  <p className="text-xs font-bold text-accent mb-4">
                    {result.remaining >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                  <p className={`font-display text-5xl font-extrabold tracking-tight ${result.remaining >= 0 ? 'text-text-primary' : 'text-accent'}`}>
                    {formatCurrency(Math.abs(result.remaining))}
                  </p>
                  <div className="mt-8 flex justify-between items-center text-xs font-bold">
                    <span className="text-text-muted">Money retained</span>
                    <span className="text-accent">{((result.remaining / result.income) * 100 || 0).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-6 pt-8">
                  <p className="text-xs font-black text-text-dim mb-8">Allocation Breakdown</p>
                  {result.breakdown.map((item) => (
                    item.amount > 0 && (
                      <div key={item.category}>
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-xs font-bold tracking-wider text-text-primary">{item.category}</span>
                          <span className="text-xs font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-3xl font-display font-bold mb-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">?</div>
                <p className="text-sm font-medium">Add your income and expenses to see results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPlanner;

