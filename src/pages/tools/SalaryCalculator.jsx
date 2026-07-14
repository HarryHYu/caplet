import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { calculateSalaryBreakdown, DEFAULT_SUPER_RATE } from '../../lib/salaryCalculations';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const SalaryCalculator = () => {
  const [grossSalary, setGrossSalary] = useState('');
  const [includeMedicare, setIncludeMedicare] = useState(true);
  const [superRate, setSuperRate] = useState(String(DEFAULT_SUPER_RATE));
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setResult(calculateSalaryBreakdown({ grossSalary, superRate, includeMedicare }));
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-xl block mb-4">Tools, compensation</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6">
                Salary Calculator
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Work out your net pay and see how your total compensation package breaks down.
              </p>
            </div>
            <Link to="/fintools" className="btn-secondary text-sm px-8">
              Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-8 lg:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Compensation Inputs</h2>
            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <label htmlFor="gross-salary" className="text-sm font-semibold text-text-dim mb-4 block">
                  Gross Annual Salary (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    id="gross-salary"
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
                  <label htmlFor="super-rate" className="text-sm font-semibold text-text-dim mb-4 block">
                    Superannuation Rate (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      id="super-rate"
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
                  <p className="text-xs font-semibold text-text-dim mt-4">Current SG baseline: 12% (from 1 July 2025)</p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIncludeMedicare(!includeMedicare)}
                    aria-pressed={includeMedicare}
                    aria-label={`Include simplified Medicare levy estimate: ${includeMedicare ? 'on' : 'off'}`}
                    className={`w-12 h-6 rounded-full transition-all relative ${includeMedicare ? 'bg-accent' : 'bg-surface-soft'}`}
                  >
                    <div className={`absolute top-1 bottom-1 w-4 rounded-full transition-all ${includeMedicare ? 'right-1 bg-white' : 'left-1 bg-text-dim'}`} />
                  </button>
                  <span className="text-sm font-semibold text-text-primary">Medicare Levy (2%)</span>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-4 mt-4 hover:-translate-y-0.5 transition-transform">
                Calculate Breakdown
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-8 lg:p-12 flex flex-col min-h-full shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Net Projection</h2>

            <div aria-live="polite" aria-atomic="true" className="flex-1">
            {result ? (
              result.error ? (
                <p className="text-sm font-semibold text-accent">{result.error}</p>
              ) : (
                <div className="space-y-10">
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-3">Annual Net Pay</p>
                    <p className="text-5xl font-black tracking-tight text-text-primary">
                      {formatCurrency(result.netPay)}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-semibold text-text-muted">Gross Annual</p>
                      <p className="text-xl font-bold">{formatCurrency(result.gross)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-raised rounded-2xl p-5">
                        <p className="text-xs font-semibold text-text-muted mb-1">Income Tax</p>
                        <p className="text-lg font-bold">{formatCurrency(result.incomeTax)}</p>
                      </div>
                      <div className="bg-surface-raised rounded-2xl p-5">
                        <p className="text-xs font-semibold text-text-muted mb-1">Medicare</p>
                        <p className="text-lg font-bold">{formatCurrency(result.medicare)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-end text-accent">
                      <p className="text-xs font-semibold">Superannuation ({result.superRate}%)</p>
                      <p className="text-xl font-bold">{formatCurrency(result.superAmount)}</p>
                    </div>

                    <div className="bg-surface-raised rounded-2xl p-6">
                      <p className="text-xs font-bold text-text-muted mb-2">Estimated total package</p>
                      <p className="text-3xl font-black tracking-tight">{formatCurrency(result.totalPackage)}</p>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-text-dim">Salary plus super. Tax and Medicare affect take-home pay, not the package amount.</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-xs font-black mb-6 text-accent">NET</div>
                <p className="text-sm font-semibold text-text-muted">Enter your salary to see results</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculator;
