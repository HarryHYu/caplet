/* eslint-disable react-refresh/only-export-components -- calculator configuration and pure helpers are re-exported for regression tests */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { FinancialAssumptions, FormField } from '../../components/AccessibleUI';
import { TAX_YEARS, DEFAULT_TAX_YEAR, calculateTax, formatCurrencyAUD as formatCurrency } from './toolMath';

// The bracket table and calculation now live in ./toolMath so other tools
// (e.g. the Capital Gains estimator) reuse the same current-year figures.
export { TAX_YEARS, DEFAULT_TAX_YEAR, calculateTax } from './toolMath';

const TaxCalculator = () => {
  const [income, setIncome] = useState('');
  const [taxYear, setTaxYear] = useState(DEFAULT_TAX_YEAR);
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

    const tax = calculateTax(parsedIncome, taxYear);
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
      taxYear,
    });
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-2xl text-accent -rotate-2 inline-block">Tools, compliance</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-3 mb-6">
                Tax <br />Architecture
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Work out your fiscal obligation and net outcome based on residency brackets.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8 press">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Assessment Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-10">
              <FormField id="tax-year" label="Financial year">
                {(fieldProps) => (
                  <select {...fieldProps} value={taxYear} onChange={(e) => { setTaxYear(e.target.value); setResult(null); }} className="w-full rounded-xl border border-line-soft bg-surface-body px-4 py-4 text-base font-bold text-text-primary">
                    {Object.entries(TAX_YEARS).map(([value, year]) => <option key={value} value={value}>{year.label}</option>)}
                  </select>
                )}
              </FormField>

              <FormField id="tax-income" label="Annual taxable income (AUD)" error={error} required>
                {(fieldProps) => (
                  <div className="relative rounded-xl bg-surface-body px-4 focus-within:ring-2 focus-within:ring-accent transition-shadow">
                    <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      {...fieldProps}
                      type="number"
                      min="0"
                      step="100"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent pl-6 pr-4 py-4 text-2xl font-bold text-text-primary placeholder:text-text-dim/60"
                    />
                  </div>
                )}
              </FormField>

              <div className="flex items-center gap-4 p-6 rounded-2xl bg-surface-body">
                <input
                  id="medicare"
                  type="checkbox"
                  aria-describedby="medicare-hint"
                  checked={includeMedicare}
                  onChange={(e) => setIncludeMedicare(e.target.checked)}
                  className="w-5 h-5 accent-accent bg-transparent"
                />
                <label htmlFor="medicare" className="text-sm font-semibold text-text-primary">
                  Include simplified Medicare levy estimate (2.0%)
                </label>
                <p id="medicare-hint" className="sr-only">This simplified estimate excludes low-income thresholds, reductions, exemptions, and the Medicare levy surcharge.</p>
              </div>

              <button type="submit" className="btn-primary press w-full py-5 press">
                Calculate Tax
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Fiscal Summary</h2>

            <div aria-live="polite" aria-atomic="true" className="flex-1">
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

                  <div className="bg-accent text-accent-contrast rounded-2xl p-8">
                    <p className="text-xs font-medium text-accent-contrast/70 mb-4">Net liquidity (annual)</p>
                    <p className="font-display text-3xl font-extrabold tracking-tight">{formatCurrency(result.netIncome)}</p>
                  </div>

                  <div className="text-xs text-text-dim space-y-2 font-semibold">
                    <p>• AU resident rates ({TAX_YEARS[result.taxYear].label})</p>
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

        <div className="mt-8 reveal">
          <FinancialAssumptions
            period={TAX_YEARS[taxYear].label}
            verified="13 July 2026"
            included={['Australian resident marginal income-tax rates', 'Optional flat 2% Medicare levy estimate']}
            excluded={['Offsets and deductions', 'HELP and other study loans', 'Medicare thresholds, reductions, exemptions, and surcharge']}
            sources={[
              { label: 'ATO tax-rate changes', href: 'https://www.ato.gov.au/api/public/content/0-307bd737-ce3a-4500-8a3d-77b5fd2a774a' },
              { label: 'ATO calculators', href: 'https://www.ato.gov.au/calculators' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;
