import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

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
      <label htmlFor={`nw-${groupKey}-${field}`} className="text-sm font-semibold text-text-dim mb-4 block">{label}</label>
      <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
        <input
          id={`nw-${groupKey}-${field}`}
          type="number" min="0" step="100" value={values[field]} placeholder="0.00"
          onChange={(e) => set(groupKey, field, e.target.value)}
          data-control-unstyled
          className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
        />
      </div>
    </div>
  );

  useReveal();

  return (
    <div className="minimal-page !min-h-0 pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Tools, Wealth</span>
              <h1 className="minimal-page-title">Net Worth Calculator.</h1>
              <p className="minimal-page-description">
                Total assets minus total liabilities, the single most honest number in personal finance.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">&larr; Back to Tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-6">Assets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {ASSETS.map(({ label, key }) => (
                    <InputRow key={key} label={label} groupKey="assets" field={key} values={assets} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-6">Liabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {LIABILITIES.map(({ label, key }) => (
                    <InputRow key={key} label={label} groupKey="liabilities" field={key} values={liabilities} />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary press w-full py-4 text-sm press">Calculate Net Worth</button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col relative overflow-hidden card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-8 relative z-10">Result</h2>
            {result ? (
              <div className="animate-rise space-y-8 relative z-10">
                <div>
                  <p className="text-xs font-semibold text-text-dim mb-4 uppercase tracking-wide">Net Worth</p>
                  <p className={`font-display text-5xl font-extrabold tracking-tight ${result.netWorth >= 0 ? 'text-text-primary' : 'text-text-error'}`}>
                    {formatCurrency(result.netWorth)}
                  </p>
                </div>
                <div className="pt-10 space-y-8">
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
                    <div className="pt-8 rounded-2xl bg-surface-raised p-6 shadow-pop">
                      <p className="text-xs font-medium text-text-dim mb-2">Debt-to-Asset Ratio</p>
                      <p className="font-display text-2xl font-bold tracking-tight">{((result.totalLiabilities / result.totalAssets) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-text-dim mt-1">
                        {result.totalLiabilities / result.totalAssets < 0.36
                          ? 'Healthy debt level'
                          : result.totalLiabilities / result.totalAssets < 0.5
                          ? 'Manageable, monitor closely'
                          : 'High, consider debt reduction'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center text-sm font-display font-extrabold mb-8">NW</div>
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
