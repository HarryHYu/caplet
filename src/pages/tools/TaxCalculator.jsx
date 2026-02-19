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
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Compliance</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Tax <br />Architecture.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Synthesize your fiscal obligation and optimize net outcome based on residency brackets.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-xs uppercase tracking-widest px-8">
              &larr; Back to Instruments
            </Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Assessment Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Annual Taxable Income (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-surface-raised border border-line-soft">
                <input
                  id="medicare"
                  type="checkbox"
                  checked={includeMedicare}
                  onChange={(e) => setIncludeMedicare(e.target.checked)}
                  className="w-5 h-5 accent-accent bg-transparent border-line-soft"
                />
                <label htmlFor="medicare" className="text-[10px] font-black uppercase tracking-widest text-text-primary">
                  Integrate Medicare Levy (2.0%)
                </label>
              </div>

              {error && (
                <div className="text-[10px] font-bold text-accent uppercase tracking-widest">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Execute Assessment
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Fiscal Summary</h2>

            {result ? (
              <div className="space-y-12 relative z-10">
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Estimated Liability</p>
                  <p className="text-5xl font-black tracking-tighter text-text-primary">
                    {formatCurrency(result.totalTax)}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mt-4">Effective Rate: {result.effectiveRate.toFixed(2)}%</p>
                </div>

                <div className="pt-10 border-t border-line-soft space-y-8">
                  <div className="grid grid-cols-2 gap-px bg-line-soft border border-line-soft">
                    <div className="bg-surface-body p-6">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Income Tax</p>
                      <p className="text-lg font-bold">{formatCurrency(result.incomeTax)}</p>
                    </div>
                    <div className="bg-surface-body p-6">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Medicare</p>
                      <p className="text-lg font-bold">{formatCurrency(result.medicare)}</p>
                    </div>
                  </div>

                  <div className="bg-surface-body p-8 border border-line-soft">
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4">Net Liquidity (Annual)</p>
                    <p className="text-3xl font-black text-accent">{formatCurrency(result.netIncome)}</p>
                  </div>

                  <div className="pt-8 border-t border-line-soft text-[9px] text-text-dim space-y-2 opacity-60 uppercase tracking-widest font-bold">
                    <p>• AU Resident Rates (2023-24)</p>
                    <p>• Excludes HECS/HELP Adjustments</p>
                    <p>• Schematic Educational Purpose Only</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">FISCAL</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Awaiting Income Data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;


