import { useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateTax } from './TaxCalculator';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const SalaryCalculator = () => {
  const [grossSalary, setGrossSalary] = useState('');
  const [includeMedicare, setIncludeMedicare] = useState(true);
  const [superRate, setSuperRate] = useState('11');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const gross = parseFloat(grossSalary) || 0;

    if (gross <= 0) {
      setResult({ error: 'Please enter a valid gross salary.' });
      return;
    }

    const superAmount = gross * (parseFloat(superRate) / 100);
    const taxableIncome = gross;

    const incomeTax = calculateTax(taxableIncome);
    const medicare = includeMedicare ? taxableIncome * 0.02 : 0;
    const totalTax = incomeTax + medicare;

    const netPay = gross - totalTax;
    const takeHomeWithSuper = netPay + superAmount;

    setResult({
      gross,
      superAmount,
      incomeTax,
      medicare,
      totalTax,
      netPay,
      takeHomeWithSuper,
      superRate: parseFloat(superRate),
    });
  };

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Compensation</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Salary <br />Genesis.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Synthesize your net liquidity and map the distribution of your total compensation package.
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
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Compensation Inputs</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Gross Annual Revenue (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Superannuation Rate (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={superRate}
                      onChange={(e) => setSuperRate(e.target.value)}
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p className="text-[9px] font-bold text-text-dim mt-4 uppercase tracking-[0.2em]">STATUTORY DEFAULT: 11% (23/24)</p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIncludeMedicare(!includeMedicare)}
                    className={`w-12 h-6 border transition-all relative ${includeMedicare ? 'border-accent bg-accent' : 'border-line-soft bg-surface-soft'}`}
                  >
                    <div className={`absolute top-1 bottom-1 w-4 transition-all ${includeMedicare ? 'right-1 bg-white' : 'left-1 bg-text-dim'}`} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Medicare Levy (2%)</span>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Confirm Breakdown
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Net Projection</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Annual Net Liquidity</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.netPay)}
                    </p>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-line-soft">
                    <div className="flex justify-between items-end">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Gross Annual</p>
                      <p className="text-xl font-bold">{formatCurrency(result.gross)}</p>
                    </div>

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

                    <div className="flex justify-between items-end text-accent">
                      <p className="text-[9px] font-bold uppercase tracking-widest">Superannuation ({result.superRate}%)</p>
                      <p className="text-xl font-bold">{formatCurrency(result.superAmount)}</p>
                    </div>

                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted mb-4">Total Package Value</p>
                      <p className="text-3xl font-black tracking-tight">{formatCurrency(result.takeHomeWithSuper)}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">NET</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Awaiting Economic Logic</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculator;

