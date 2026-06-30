import { useState } from 'react';
import { Link } from 'react-router-dom';

const TAX_BRACKETS = [
  { threshold: 0, rate: 0, base: 0 },
  { threshold: 18200, rate: 0.19, base: 0 },
  { threshold: 45000, rate: 0.325, base: 5092 },
  { threshold: 120000, rate: 0.37, base: 29467 },
  { threshold: 180000, rate: 0.45, base: 51667 },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

/* eslint-disable-next-line react-refresh/only-export-components -- shared util */
export const calculateTax = (income) => {
  if (!income || income <= 0) return 0;

  let tax = 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i -= 1) {
    const bracket = TAX_BRACKETS[i];
    if (income > bracket.threshold) {
      tax = bracket.base + (income - bracket.threshold) * bracket.rate;
      break;
    }
  }
  return tax;
};

const TaxCalculator = () => {
  const [income, setIncome] = useState('');
  const [includeMedicare, setIncludeMedicare] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const parsedIncome = parseFloat(String(income).replace(/,/g, ''));
    if (Number.isNaN(parsedIncome) || parsedIncome < 0) {
      setError('Please enter a valid taxable income.');
      setResult(null);
      return;
    }

    const tax = calculateTax(parsedIncome);
    const medicare = includeMedicare ? parsedIncome * 0.02 : 0;
    const totalTax = tax + medicare;
    const netIncome = parsedIncome - totalTax;
    const effectiveRate = parsedIncome > 0 ? (totalTax / parsedIncome) * 100 : 0;

    setResult({
      taxableIncome: parsedIncome,
      incomeTax: tax,
      medicare,
      totalTax,
      netIncome,
      effectiveRate,
    });
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-2xl text-accent">Tools, compliance</span>
              <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mt-3 mb-6">
                Tax <br />Architecture
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Work out your fiscal obligation and net outcome based on residency brackets.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8 hover:-translate-y-0.5 transition-transform">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Assessment Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-10">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-3 block">
                  Annual taxable income (AUD)
                </label>
                <div className="relative rounded-xl bg-surface-body px-4 focus-within:ring-2 focus-within:ring-accent transition-shadow">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
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

              <div className="flex items-center gap-4 p-6 rounded-2xl bg-surface-body">
                <input
                  id="medicare"
                  type="checkbox"
                  checked={includeMedicare}
                  onChange={(e) => setIncludeMedicare(e.target.checked)}
                  className="w-5 h-5 accent-accent bg-transparent"
                />
                <label htmlFor="medicare" className="text-sm font-semibold text-text-primary">
                  Include Medicare levy (2.0%)
                </label>
              </div>

              {error && (
                <div className="text-sm font-medium text-accent">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-5 hover:-translate-y-0.5 transition-transform">
                Calculate Tax
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Fiscal Summary</h2>

            {result ? (
              <div className="space-y-10">
                <div>
                  <p className="text-xs font-semibold text-text-dim mb-3">Estimated liability</p>
                  <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                    {formatCurrency(result.totalTax)}
                  </p>
                  <p className="text-xs font-bold text-text-muted mt-4">Effective rate: {result.effectiveRate.toFixed(2)}%</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-raised rounded-2xl p-6">
                      <p className="text-xs font-medium text-text-dim mb-1">Income tax</p>
                      <p className="text-lg font-bold">{formatCurrency(result.incomeTax)}</p>
                    </div>
                    <div className="bg-surface-raised rounded-2xl p-6">
                      <p className="text-xs font-medium text-text-dim mb-1">Medicare</p>
                      <p className="text-lg font-bold">{formatCurrency(result.medicare)}</p>
                    </div>
                  </div>

                  <div className="bg-accent text-white rounded-2xl p-8">
                    <p className="text-xs font-medium text-white/70 mb-4">Net liquidity (annual)</p>
                    <p className="font-display text-3xl font-extrabold tracking-tight">{formatCurrency(result.netIncome)}</p>
                  </div>

                  <div className="text-xs text-text-dim space-y-2 font-semibold">
                    <p>• AU resident rates (2023-24)</p>
                    <p>• Excludes HECS/HELP adjustments</p>
                    <p>• For educational purposes only</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-xs font-bold mb-8">$</div>
                <p className="text-sm font-medium">Enter your income to see results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;


