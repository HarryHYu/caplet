import { useState } from 'react';
import { Link } from 'react-router-dom';
import CalculatorShell from '../../components/tools/CalculatorShell';
import CalculatorCard from '../../components/tools/CalculatorCard';
import ResultPanel from '../../components/tools/ResultPanel';
import FormRow from '../../components/tools/FormRow';

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
    <CalculatorShell>
        {/* Header */}
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Utility</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Budget<br />Planner.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Synthesize your monthly cash flow and track allocation across your primary cost centers.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-xs uppercase tracking-widest px-8">
              &larr; Back to tools
            </Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <CalculatorCard title="Your budget">

            <form onSubmit={handleSubmit} className="space-y-16">
              <FormRow label="Net Monthly Income (AUD)" prefix="$" italic={false}>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </FormRow>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {Object.keys(expenses).map((key) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block">
                      {key} Account
                    </label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={expenses[key]}
                        onChange={(e) => setExpenses({ ...expenses, [key]: e.target.value })}
                        placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-12">
                Execute Calculation
              </button>
            </form>
          </CalculatorCard>

          <ResultPanel title="Economic Summary" result={result} emptyIcon="?" emptyMessage="Add your income and expenses">
            {result ? (
              <div className="space-y-12 relative z-10">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-2">Total Income</p>
                    <p className="text-3xl font-bold tracking-tight">{formatCurrency(result.income)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-2">Total Outflow</p>
                    <p className="text-3xl font-bold tracking-tight">{formatCurrency(result.totalExpenses)}</p>
                  </div>
                </div>

                <div className="bg-surface-body p-10 border border-line-soft">
                  <p className="text-[9px] font-bold text-accent uppercase tracking-[0.3em] mb-4">
                    {result.remaining >= 0 ? 'Surplus Logic' : 'Deficit Warning'}
                  </p>
                  <p className={`text-5xl font-black tracking-tighter ${result.remaining >= 0 ? 'text-text-primary' : 'text-accent'}`}>
                    {formatCurrency(Math.abs(result.remaining))}
                  </p>
                  <div className="mt-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-text-muted">Economic Retention</span>
                    <span className="text-accent">{((result.remaining / result.income) * 100 || 0).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-6 pt-12 border-t border-line-soft">
                  <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] mb-8">Allocation Breakdown</p>
                  {result.breakdown.map((item) => (
                    item.amount > 0 && (
                      <div key={item.category}>
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">{item.category}</span>
                          <span className="text-xs font-bold font-serif italic">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="w-full bg-surface-soft h-1 overflow-hidden">
                          <div
                            className="bg-text-dim h-full transition-all duration-1000 ease-out"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ) : null}
          </ResultPanel>
        </div>
    </CalculatorShell>
  );
};

export default BudgetPlanner;

