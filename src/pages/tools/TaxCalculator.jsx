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
    <div className="min-h-screen py-24 page-section-light">
      <section className="border-b border-zinc-100 dark:border-zinc-900 mb-20 pb-20">
        <div className="container-custom">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8 animate-slide-up">
              <div>
                <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-4">
                  Financial Tools
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Tax <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Estimate Australian income tax, Medicare levy, and take-home pay.
                </p>
              </div>
              <Link to="/tools" className="text-[10px] font-black text-zinc-400 hover:text-brand uppercase tracking-widest transition-colors mb-auto">
                ← Back to Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl">
            <div className="lg:col-span-2 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 p-10 reveal-up">
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Assessment Parameters</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Taxable income (annual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="e.g. 85000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="medicare"
                    type="checkbox"
                    checked={includeMedicare}
                    onChange={(e) => setIncludeMedicare(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                  />
                  <label htmlFor="medicare" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include Medicare levy (2%)
                  </label>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Calculate tax
                </button>
              </form>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Summary
              </h2>
              {result ? (
                <div className="space-y-4">
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Taxable income</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                      {formatCurrency(result.taxableIncome)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Income tax</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.incomeTax)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Medicare levy</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.medicare)}
                      </p>
                    </div>
                  </div>
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total tax</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                      {formatCurrency(result.totalTax)}
                    </p>
                  </div>
                  <div className="break-words">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Take-home pay</p>
                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                      {formatCurrency(result.netIncome)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Effective tax rate: {result.effectiveRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your taxable income to see your estimated tax for the year.
                </p>
              )}

              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                <p>• Based on Australian resident tax rates for 2023-24.</p>
                <p>• Does not include offsets, HECS/HELP, or other levies.</p>
                <p>• For educational purposes only. Consult a professional for personalised advice.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TaxCalculator;


