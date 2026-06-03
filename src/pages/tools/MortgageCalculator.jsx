import { useState } from 'react';
import { CalculatorFormPanel, CalculatorResultPanel, CalculatorShell } from '../../components/tools';

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

  return (
    <CalculatorShell
      category="Mortgage"
      title={<>Equity <br />Strategist.</>}
      description="Simulate property acquisition debt and optimize your long-term capital allocation strategies."
    >
      <CalculatorFormPanel title="Acquisition Parameters">
        <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Property Loan Amount (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </FormRow>

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
                    Loan Term
                  </label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Generate Amortization Logic
              </button>
            </form>
      </CalculatorFormPanel>

      <CalculatorResultPanel title="Economic Projection">

        {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-4 italic">Standard Monthly Installment</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.monthlyPayment)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-line-soft border border-line-soft">
                    <div className="bg-surface-body p-6">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Weekly</p>
                      <p className="text-lg font-bold">{formatCurrency(result.weeklyPayment)}</p>
                    </div>
                    <div className="bg-surface-body p-6">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Fortnightly</p>
                      <p className="text-lg font-bold">{formatCurrency(result.fortnightlyPayment)}</p>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Aggregate Obligation</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalPayments)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-1">Interest Layer</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.totalInterest)}</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-[10px] font-serif italic text-text-dim leading-relaxed">
                        Property acquisition remains the primary mechanism for domestic capital accumulation. Repayment discipline is paramount.
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">EQUITY</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Enter your loan details</p>
              </div>
            )}
      </CalculatorResultPanel>
    </CalculatorShell>
  );
};

export default MortgageCalculator;

