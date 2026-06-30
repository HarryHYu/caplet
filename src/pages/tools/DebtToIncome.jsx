import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const DEBT_FIELDS = [
  { label: 'Mortgage / Rent', key: 'housing' },
  { label: 'Car Loan', key: 'carLoan' },
  { label: 'Credit Card Minimums', key: 'creditCards' },
  { label: 'Student / HECS Loan', key: 'studentLoan' },
  { label: 'Personal Loans', key: 'personalLoans' },
  { label: 'Other Debt Payments', key: 'other' },
];

const DebtToIncome = () => {
  const [grossIncome, setGrossIncome] = useState('');
  const [incomeFreq, setIncomeFreq] = useState('monthly');
  const [debts, setDebts] = useState({ housing: '', carLoan: '', creditCards: '', studentLoan: '', personalLoans: '', other: '' });
  const [result, setResult] = useState(null);

  const freqMultiplier = { monthly: 1, fortnightly: 26 / 12, weekly: 52 / 12, annual: 1 / 12 };

  const handleSubmit = (e) => {
    e.preventDefault();
    const monthlyIncome = (parseFloat(grossIncome) || 0) * freqMultiplier[incomeFreq];
    const totalDebt = Object.values(debts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    if (monthlyIncome <= 0) {
      setResult({ error: 'Please enter a valid gross income.' });
      return;
    }
    const dti = (totalDebt / monthlyIncome) * 100;
    const maxRecommended = monthlyIncome * 0.36;
    setResult({ dti, totalDebt, monthlyIncome, maxRecommended });
  };

  const getDTIBand = (dti) => {
    if (dti < 28) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (dti < 36) return { label: 'Good', color: 'text-accent' };
    if (dti < 43) return { label: 'Manageable', color: 'text-yellow-600 dark:text-yellow-400' };
    if (dti < 50) return { label: 'High — lenders may hesitate', color: 'text-orange-500' };
    return { label: 'Risky — seek advice', color: 'text-red-500' };
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-xl">Tools, Debt & Loans</span>
              <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mb-8 mt-2">Debt-to-Income<br />Ratio.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Your DTI is the first thing lenders check. Know yours before they do.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8 hover:-translate-y-0.5 transition-transform">Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-8">Gross Income</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-3 block">Amount (AUD)</label>
                    <div className="relative bg-surface-body rounded-xl border border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                      <input type="number" min="0" step="100" value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-3 block">Frequency</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['monthly', 'fortnightly', 'weekly', 'annual'].map((f) => (
                        <button key={f} type="button" onClick={() => setIncomeFreq(f)}
                          className={`py-3 text-xs font-bold rounded-xl capitalize transition-colors ${incomeFreq === f ? 'bg-accent text-white' : 'bg-surface-body text-text-muted hover:text-text-primary'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-8">Monthly Debt Payments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {DEBT_FIELDS.map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-sm font-semibold text-text-dim mb-3 block">{label}</label>
                      <div className="relative bg-surface-body rounded-xl border border-line-soft focus-within:border-accent transition-colors">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                        <input type="number" min="0" step="10" value={debts[key]}
                          onChange={(e) => setDebts(prev => ({ ...prev, [key]: e.target.value }))} placeholder="0"
                          className="w-full bg-transparent pl-9 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-5 hover:-translate-y-0.5 transition-transform">Calculate DTI Ratio</button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-16 flex flex-col min-h-full relative overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-12 relative z-10">DTI Result</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-semibold text-accent relative z-10">{result.error}</p>
              ) : (() => {
                const band = getDTIBand(result.dti);
                return (
                  <div className="space-y-12 relative z-10">
                    <div>
                      <p className="text-xs font-semibold text-text-dim mb-3">Your DTI Ratio</p>
                      <p className="font-display text-6xl font-extrabold tracking-tight text-text-primary">{result.dti.toFixed(1)}%</p>
                      <p className={`text-sm font-bold mt-3 ${band.color}`}>{band.label}</p>
                    </div>
                    <div className="space-y-8">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-semibold text-text-dim mb-1">Monthly Income</p>
                          <p className="text-xl font-bold">{formatCurrency(result.monthlyIncome)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-text-dim mb-1">Total Monthly Debt</p>
                          <p className="text-xl font-bold text-accent">{formatCurrency(result.totalDebt)}</p>
                        </div>
                      </div>
                      <div className="bg-surface-raised rounded-2xl p-6">
                        <p className="text-xs font-semibold text-text-dim mb-2">Recommended max debt payment</p>
                        <p className="text-2xl font-bold">{formatCurrency(result.maxRecommended)}<span className="text-sm font-medium text-text-dim">/mo</span></p>
                        <p className="text-xs text-text-dim mt-1">Based on the 36% rule most lenders use.</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-sm font-display font-extrabold text-accent mb-8">DTI</div>
                <p className="text-sm font-semibold text-text-muted">Enter income and debt payments.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtToIncome;
