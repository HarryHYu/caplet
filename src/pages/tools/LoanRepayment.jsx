import { useState } from 'react';
import { Link } from 'react-router-dom';
import AffiliateListings from '../../components/affiliates/AffiliateListings';
import { useReveal } from '../../lib/useReveal';

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

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="mb-3 font-hand text-lg text-accent -rotate-2 inline-block">Loan repayments</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6">
                Loan repayments.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                See your monthly payment, total interest, and how long it takes to clear the loan.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">
              &larr; Back to tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-14 shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Loan Details</h2>
            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <label htmlFor="loan-amount" className="text-sm font-semibold text-text-dim mb-4 block">
                  Loan Amount (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input id="loan-amount"
                    type="number"
                    min="0"
                    step="1000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label htmlFor="loan-rate" className="text-sm font-semibold text-text-dim mb-4 block">
                    Annual Rate (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input id="loan-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="loan-term" className="text-sm font-semibold text-text-dim mb-4 block">
                    Loan Term (Years)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input id="loan-term"
                      type="number"
                      min="0.5"
                      max="50"
                      step="0.5"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary press w-full py-5 mt-4 press">
                Calculate Repayments
              </button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-14 flex flex-col min-h-full shadow-card card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Your Results</h2>

            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <>
                  <div className="animate-rise space-y-10">
                    <div>
                      <p className="text-xs font-semibold text-text-dim mb-3">Monthly Payment</p>
                      <p className="text-5xl font-display font-extrabold tracking-tight text-text-primary">
                        {formatCurrency(result.monthlyPayment)}
                      </p>
                    </div>

                    <div className="space-y-8">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-semibold text-text-dim mb-1">Total Paid</p>
                          <p className="text-xl font-bold">{formatCurrency(result.totalPayments)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-text-dim mb-1">Total Interest</p>
                          <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                        </div>
                      </div>

                      <div className="bg-surface-raised/60 rounded-2xl p-5">
                        <p className="text-xs font-semibold text-text-dim mb-3">Schedule</p>
                        <div className="flex items-center gap-4 text-sm font-semibold">
                          <span className="text-text-primary">{result.numPayments} Payments</span>
                          <span className="text-text-muted">Fixed monthly</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-sm font-display font-extrabold text-accent mb-6">P+I</div>
                <p className="text-sm font-semibold">Enter your loan details to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sponsored listings sit outside the educational results panel so the
            teaching content is never mixed up with anything commercial. */}
        {result && !result.error ? (
          <section className="mt-10" aria-labelledby="loan-sponsored-title">
            <div className="flex items-center gap-4">
              <h2 id="loan-sponsored-title" className="shrink-0 text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Sponsored listings</h2>
              <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mt-2 text-sm font-medium text-text-muted">Paid placements from third parties. Nothing above this line is sponsored, and Caplet does not sell any product.</p>
            <div className="mt-5 rounded-3xl bg-surface-raised p-6 shadow-card md:p-8">
              <AffiliateListings type="car" maxBudget={parseFloat(loanAmount) || undefined} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default LoanRepayment;

