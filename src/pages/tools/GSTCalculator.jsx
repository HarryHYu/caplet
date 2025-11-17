import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const GSTCalculator = () => {
  const [amount, setAmount] = useState('');
  const [calculationType, setCalculationType] = useState('add'); // 'add' or 'remove'
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount) || 0;

    if (amountNum <= 0) {
      setResult({ error: 'Please enter a valid amount.' });
      return;
    }

    const GST_RATE = 0.10; // 10% GST in Australia

    if (calculationType === 'add') {
      // Add GST to amount
      const gst = amountNum * GST_RATE;
      const total = amountNum + gst;
      setResult({
        originalAmount: amountNum,
        gst,
        total,
        type: 'add',
      });
    } else {
      // Remove GST from amount (GST inclusive)
      const gst = amountNum * (GST_RATE / (1 + GST_RATE));
      const base = amountNum - gst;
      setResult({
        originalAmount: amountNum,
        gst,
        base,
        type: 'remove',
      });
    }
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
                  GST Calculator
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                  Add or remove GST (10%) from amounts for Australian Goods and Services Tax calculations.
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Enter amount</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Calculation Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="add"
                        checked={calculationType === 'add'}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Add GST</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="remove"
                        checked={calculationType === 'remove'}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Remove GST</span>
                    </label>
                  </div>
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
                    {result.type === 'add' ? (
                      <>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Original Amount</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                            {formatCurrency(result.originalAmount)}
                          </p>
                        </div>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">GST (10%)</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                            {formatCurrency(result.gst)}
                          </p>
                        </div>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total (GST Inclusive)</p>
                          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                            {formatCurrency(result.total)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">GST Inclusive Amount</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                            {formatCurrency(result.originalAmount)}
                          </p>
                        </div>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">GST (10%)</p>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400 break-words overflow-wrap-anywhere">
                            {formatCurrency(result.gst)}
                          </p>
                        </div>
                        <div className="break-words">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Base Amount (GST Exclusive)</p>
                          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere">
                            {formatCurrency(result.base)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter an amount and select calculation type to see GST breakdown.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GSTCalculator;

