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

    // Calculate superannuation
    const superAmount = gross * (parseFloat(superRate) / 100);
    const taxableIncome = gross; // Super is on top, not deducted from taxable income

    // Calculate tax
    const incomeTax = calculateTax(taxableIncome);
    const medicare = includeMedicare ? taxableIncome * 0.02 : 0;
    const totalTax = incomeTax + medicare;

    // Net pay (after tax, super is separate)
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wide mb-2">
                  Caplet Tools
                </p>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Salary Calculator
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                  Calculate your take-home pay from gross salary, including tax, Medicare, and superannuation.
                </p>
              </div>
              <Link to="/tools" className="text-sm text-blue-600 dark:text-blue-300 hover:underline">
                ← Back to tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Enter salary details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gross Annual Salary
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    placeholder="e.g. 80000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Superannuation Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={superRate}
                    onChange={(e) => setSuperRate(e.target.value)}
                    placeholder="e.g. 11"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard is 11% (2023-24)</p>
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

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Calculate
                </button>
              </form>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-700 p-6 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Results</h2>
              {result ? (
                result.error ? (
                  <p className="text-red-600 dark:text-red-400 text-sm">{result.error}</p>
                ) : (
                  <div className="space-y-4">
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gross Salary</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.gross)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Income Tax</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                          {formatCurrency(result.incomeTax)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Medicare</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                          {formatCurrency(result.medicare)}
                        </p>
                      </div>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Tax</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.totalTax)}
                      </p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Net Pay (After Tax)</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.netPay)}
                      </p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Superannuation ({result.superRate}%)</p>
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.superAmount)}
                      </p>
                    </div>
                    <div className="break-words pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Package Value</p>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.takeHomeWithSuper)}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter your gross salary to see your take-home pay breakdown.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SalaryCalculator;

