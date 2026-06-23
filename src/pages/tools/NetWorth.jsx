import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const ASSETS = [
  { label: 'Cash & Bank Accounts', key: 'cash' },
  { label: 'Shares & Investments', key: 'investments' },
  { label: 'Property (Market Value)', key: 'property' },
  { label: 'Vehicles', key: 'vehicles' },
  { label: 'Other Assets', key: 'otherAssets' },
];
const LIABILITIES = [
  { label: 'Mortgage Balance', key: 'mortgage' },
  { label: 'Car Loan Balance', key: 'carLoan' },
  { label: 'Credit Card Balances', key: 'creditCards' },
  { label: 'Other Loans', key: 'otherLoans' },
];

const NetWorth = () => {
  const [assets, setAssets] = useState({ cash: '', investments: '', property: '', vehicles: '', otherAssets: '' });
  const [liabilities, setLiabilities] = useState({ mortgage: '', carLoan: '', creditCards: '', otherLoans: '' });
  const [result, setResult] = useState(null);

  const set = (group, key, value) => {
    if (group === 'assets') setAssets(prev => ({ ...prev, [key]: value }));
    else setLiabilities(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalAssets = Object.values(assets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    setResult({ totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities });
  };

  const InputRow = ({ label, groupKey, field, values }) => (
    <div>
      <label className="text-sm font-semibold text-text-dim mb-4 block italic">{label}</label>
      <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
        <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
        <input
          type="number" min="0" step="100" value={values[field]} placeholder="0.00"
          onChange={(e) => set(groupKey, field, e.target.value)}
          className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Wealth</span>
              <h1 className="text-6xl md:text-8xl mb-8">Net Worth<br />Calculator.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Total assets minus total liabilities — the single most honest number in personal finance.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Assets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {ASSETS.map(({ label, key }) => (
                    <InputRow key={key} label={label} groupKey="assets" field={key} values={assets} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Liabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {LIABILITIES.map(({ label, key }) => (
                    <InputRow key={key} label={label} groupKey="liabilities" field={key} values={liabilities} />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate Net Worth</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Result</h2>
            {result ? (
              <div className="space-y-12 relative z-10">
                <div>
                  <p className="text-xs font-medium text-text-dim mb-4 italic">Net Worth</p>
                  <p className={`text-5xl font-black tracking-tighter ${result.netWorth >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
                    {formatCurrency(result.netWorth)}
                  </p>
                </div>
                <div className="pt-10 border-t border-line-soft space-y-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-medium text-text-dim mb-1">Total Assets</p>
                      <p className="text-xl font-bold text-accent">{formatCurrency(result.totalAssets)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-text-dim mb-1">Total Liabilities</p>
                      <p className="text-xl font-bold">{formatCurrency(result.totalLiabilities)}</p>
                    </div>
                  </div>
                  {result.totalAssets > 0 && (
                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-xs font-medium text-text-dim mb-2">Debt-to-Asset Ratio</p>
                      <p className="text-2xl font-bold">{((result.totalLiabilities / result.totalAssets) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-text-dim mt-1 italic">
                        {result.totalLiabilities / result.totalAssets < 0.36
                          ? 'Healthy debt level'
                          : result.totalLiabilities / result.totalAssets < 0.5
                          ? 'Manageable — monitor closely'
                          : 'High — consider debt reduction'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">NW</div>
                <p className="text-sm font-medium">Enter your assets and liabilities</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetWorth;
