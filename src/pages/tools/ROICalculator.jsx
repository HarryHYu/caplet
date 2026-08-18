import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

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

  useReveal();

  return (
    <div className="minimal-page pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Tools, wealth and investing</span>
              <h1 className="minimal-page-title">Return on Investment.</h1>
              <p className="minimal-page-description">
                Calculate total ROI and annualised return on any investment (shares, property, business, or otherwise).
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8 press">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Investment Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="roi-initial" className="text-sm font-semibold text-text-dim mb-3 block">Initial Investment (AUD)</label>
                  <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input id="roi-initial"
                      type="number" min="0" step="100" value={initialInvestment} onChange={(e) => setInitialInvestment(e.target.value)} placeholder="0.00"
                      data-control-unstyled
                      className="w-full bg-transparent pl-9 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="roi-final" className="text-sm font-semibold text-text-dim mb-3 block">Final Value (AUD)</label>
                  <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input id="roi-final"
                      type="number" min="0" step="100" value={finalValue} onChange={(e) => setFinalValue(e.target.value)} placeholder="0.00"
                      data-control-unstyled
                      className="w-full bg-transparent pl-9 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <div className="max-w-xs">
                <label htmlFor="roi-years" className="text-sm font-semibold text-text-dim mb-3 block">Holding Period (optional)</label>
                <div className="relative rounded-xl bg-surface-body border border-line-soft focus-within:border-accent transition-colors">
                  <input id="roi-years"
                    type="number" min="0" step="0.5" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Years"
                    data-control-unstyled
                    className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
                <p className="text-xs text-text-dim mt-2">Required for annualised return.</p>
              </div>
              <button type="submit" className="btn-primary press w-full py-5 press">Calculate ROI</button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Return Analysis</h2>
            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-3">Total ROI</p>
                    <p className={`font-display text-5xl font-extrabold tracking-tight ${result.roi >= 0 ? 'text-text-primary' : 'text-text-error'}`}>
                      {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end gap-4">
                      <div className="bg-surface-raised/60 rounded-2xl px-5 py-4 flex-1">
                        <p className="text-xs font-semibold text-text-dim mb-1">Net Gain / Loss</p>
                        <p className={`text-xl font-bold ${result.gain >= 0 ? 'text-accent' : 'text-text-error'}`}>{formatCurrency(result.gain)}</p>
                      </div>
                      <div className="bg-surface-raised/60 rounded-2xl px-5 py-4 flex-1 text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Final Value</p>
                        <p className="text-xl font-bold">{formatCurrency(result.final)}</p>
                      </div>
                    </div>
                    {result.annualizedROI !== null && (
                      <div className="bg-surface-raised/60 rounded-2xl px-5 py-4">
                        <p className="text-xs font-semibold text-text-dim mb-2">Annualised Return (CAGR)</p>
                        <p className={`text-3xl font-bold ${result.annualizedROI >= 0 ? 'text-text-primary' : 'text-text-error'}`}>
                          {result.annualizedROI >= 0 ? '+' : ''}{result.annualizedROI.toFixed(2)}% p.a.
                        </p>
                        <p className="text-xs text-text-dim mt-1">Over {result.n} year{result.n !== 1 ? 's' : ''}.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-sm font-display font-bold mb-6">ROI</div>
                <p className="text-sm font-medium">Enter investment values to calculate returns.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;
