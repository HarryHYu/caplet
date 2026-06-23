import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const ROICalculator = () => {
  const [initialInvestment, setInitialInvestment] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const initial = parseFloat(initialInvestment) || 0;
    const final = parseFloat(finalValue) || 0;
    const n = parseFloat(years) || 0;

    if (initial <= 0 || final < 0) {
      setResult({ error: 'Please enter a valid initial investment and final value.' });
      return;
    }

    const gain = final - initial;
    const roi = (gain / initial) * 100;
    const annualizedROI = n > 0 ? (Math.pow(final / initial, 1 / n) - 1) * 100 : null;

    setResult({ gain, roi, annualizedROI, initial, final, n });
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Wealth & Investing</span>
              <h1 className="text-6xl md:text-8xl mb-8">Return on<br />Investment.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Calculate total ROI and annualised return on any investment — shares, property, business, or otherwise.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-sm font-semibold text-text-muted mb-16">Investment Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Initial Investment (AUD)</label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number" min="0" step="100" value={initialInvestment} onChange={(e) => setInitialInvestment(e.target.value)} placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Final Value (AUD)</label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                    <input
                      type="number" min="0" step="100" value={finalValue} onChange={(e) => setFinalValue(e.target.value)} placeholder="0.00"
                      className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <div className="max-w-xs">
                <label className="text-sm font-semibold text-text-dim mb-4 block italic">Holding Period (optional)</label>
                <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                  <input
                    type="number" min="0" step="0.5" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Years"
                    className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
                <p className="text-xs text-text-dim mt-2 italic">Required for annualised return</p>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate ROI</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Return Analysis</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-4 italic">Total ROI</p>
                    <p className={`text-5xl font-black tracking-tighter ${result.roi >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
                      {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
                    </p>
                  </div>
                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-1">Net Gain / Loss</p>
                        <p className={`text-xl font-bold ${result.gain >= 0 ? 'text-accent' : 'text-red-500'}`}>{formatCurrency(result.gain)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-text-dim mb-1">Final Value</p>
                        <p className="text-xl font-bold">{formatCurrency(result.final)}</p>
                      </div>
                    </div>
                    {result.annualizedROI !== null && (
                      <div className="pt-8 border-t border-line-soft">
                        <p className="text-xs font-medium text-text-dim mb-2">Annualised Return (CAGR)</p>
                        <p className={`text-3xl font-bold ${result.annualizedROI >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
                          {result.annualizedROI >= 0 ? '+' : ''}{result.annualizedROI.toFixed(2)}% p.a.
                        </p>
                        <p className="text-xs text-text-dim mt-1 italic">Over {result.n} year{result.n !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">ROI</div>
                <p className="text-sm font-medium">Enter investment values to calculate returns</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;
