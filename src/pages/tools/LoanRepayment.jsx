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
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Liability</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                Repayment <br />Protocol.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Analyze interest obligation and visualize the amortization of your debt-layer architecture.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-xs uppercase tracking-widest px-8">
              &larr; Back to Instruments
            </Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Liability Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Principal Amount (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
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
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Annual Rate (%)
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
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
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                    Amortization Term
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
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

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Confirm Repayment Cycle
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Economic Outcome</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Baseline Monthly Installment</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.monthlyPayment)}
                    </p>
                  </div>

                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Total Obligation</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalPayments)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Interest Layer</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4">Maturity Statistics</p>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-text-primary">{result.numPayments} Cycles</span>
                        <div className="w-px h-3 bg-line-soft" />
                        <span className="text-text-muted">Constant Installments</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">P+I</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Ready for Amortization</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanRepayment;

