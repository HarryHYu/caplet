import { useState } from 'react';
import AffiliateListings from '../../components/affiliates/AffiliateListings';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const MortgageCalculator = () => {
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
    const weeklyPayment = monthlyPayment / (52 / 12);
    const fortnightlyPayment = monthlyPayment / (26 / 12);

    setResult({
      monthlyPayment,
      weeklyPayment,
      fortnightlyPayment,
      totalPayments,
      totalInterest,
      numPayments,
    });
  };

  useReveal();

  return (
    <div className="minimal-page !min-h-0 pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Tools / Mortgage</span>
              <h1 className="minimal-page-title">Mortgage Calculator.</h1>
              <p className="minimal-page-description">
                Work out your repayments, total interest, and the real cost of a property loan over its full term.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Loan Details</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="mort-amount" className="text-sm font-semibold text-text-dim mb-3 block">
                  Property Loan Amount (AUD)
                </label>
                <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input id="mort-amount"
                    type="number"
                    min="0"
                    step="10000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="0.00"
                    data-control-unstyled
                    className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="mort-rate" className="text-sm font-semibold text-text-dim mb-3 block">
                    Annual Rate (%)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input id="mort-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.0"
                      data-control-unstyled
                      className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="mort-term" className="text-sm font-semibold text-text-dim mb-3 block">
                    Loan Term
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input id="mort-term"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      placeholder="Years"
                      data-control-unstyled
                      className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary press w-full py-4 mt-4 press">
                Calculate Repayments
              </button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Your Repayments</h2>

            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <>
                  <div className="animate-rise space-y-6">
                    <div>
                      <p className="text-xs font-semibold text-text-dim mb-3">Monthly Repayment</p>
                      <p className="text-5xl font-display font-extrabold tracking-tight text-blue">
                        {formatCurrency(result.monthlyPayment)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-raised rounded-2xl p-6">
                        <p className="text-xs font-semibold text-text-dim mb-1">Weekly</p>
                        <p className="text-lg font-bold">{formatCurrency(result.weeklyPayment)}</p>
                      </div>
                      <div className="bg-surface-raised rounded-2xl p-6">
                        <p className="text-xs font-semibold text-text-dim mb-1">Fortnightly</p>
                        <p className="text-lg font-bold">{formatCurrency(result.fortnightlyPayment)}</p>
                      </div>
                    </div>

                    <div className="bg-surface-raised rounded-2xl p-6 space-y-6">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-semibold text-text-dim mb-1">Total Repaid</p>
                          <p className="text-xl font-bold">{formatCurrency(result.totalPayments)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-text-dim mb-1">Total Interest</p>
                          <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-text-dim leading-relaxed">
                        Paying a little more each month, or switching to fortnightly payments, can cut years off your loan and save you interest.
                      </p>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center text-xs font-display font-extrabold mb-6">$</div>
                <p className="text-sm font-semibold text-text-muted">Enter your loan details to see repayments</p>
              </div>
            )}
          </div>
        </div>

        {/* Sponsored listings sit outside the educational results panel so the
            teaching content is never mixed up with anything commercial. */}
        {result && !result.error ? (
          <section className="mt-6" aria-labelledby="mortgage-sponsored-title">
            <div className="flex items-center gap-4">
              <h2 id="mortgage-sponsored-title" className="shrink-0 text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Sponsored listings</h2>
              <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mt-2 text-sm font-medium text-text-muted">Paid placements from third parties. Nothing above this line is sponsored, and Caplet does not sell any product.</p>
            <div className="mt-5 surface-card md:p-8">
              <AffiliateListings type="realestate" maxBudget={parseFloat(loanAmount) || undefined} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default MortgageCalculator;

