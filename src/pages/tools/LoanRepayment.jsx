import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const LoanRepayment = () => {
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const principal = parseFloat(loanAmount) || 0;
    const rate = parseFloat(interestRate) || 0;
    const years = parseFloat(loanTerm) || 0;

    if (principal <= 0 || rate <= 0 || years <= 0) {
      setResult({ error: 'Please enter valid values for all fields.' });
      return;
    }

    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;

    // Monthly payment: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalPayments = monthlyPayment * numPayments;
    const totalInterest = totalPayments - principal;

    setResult({
      monthlyPayment,
      totalPayments,
      totalInterest,
      numPayments,
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
                  Loan Repayment <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Repayment schedules, interest breakdowns, and total obligation visibility.
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
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Loan Parameters</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loan Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="e.g. 5.5"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loan Term (years)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Calculate Repayment
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payment</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.monthlyPayment)}
                      </p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount Payable</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white break-words overflow-wrap-anywhere">
                        {formatCurrency(result.totalPayments)}
                      </p>
                    </div>
                    <div className="break-words">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Interest</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400 break-words overflow-wrap-anywhere">
                        {formatCurrency(result.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Number of Payments</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {result.numPayments} payments
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Enter loan details to see your repayment schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoanRepayment;

