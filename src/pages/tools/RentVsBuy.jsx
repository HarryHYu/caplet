import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  '$' + new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value));

const RentVsBuy = () => {
  const [homePrice, setHomePrice] = useState('');
  const [downPaymentPct, setDownPaymentPct] = useState('20');
  const [mortgageRate, setMortgageRate] = useState('');
  const [loanTermYears, setLoanTermYears] = useState('30');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [compareYears, setCompareYears] = useState('10');
  const [homeAppreciation, setHomeAppreciation] = useState('4');
  const [transferTaxPct, setTransferTaxPct] = useState('4');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const price = parseFloat(homePrice) || 0;
    const dpPct = parseFloat(downPaymentPct) / 100;
    const rate = parseFloat(mortgageRate) / 100 / 12;
    const termMonths = parseFloat(loanTermYears) * 12;
    const rent = parseFloat(monthlyRent) || 0;
    const n = parseFloat(compareYears) || 0;
    const appRate = parseFloat(homeAppreciation) / 100;
    const transferTaxRate = parseFloat(transferTaxPct) / 100;

    if (price <= 0 || parseFloat(mortgageRate) <= 0 || rent <= 0 || n <= 0) {
      setResult({ error: 'Please fill in all required fields.' });
      return;
    }

    const downPayment = price * dpPct;
    const loanAmount = price - downPayment;

    // Monthly mortgage payment
    const monthlyMortgage = loanAmount * (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);

    // Total costs over comparison period
    const compareMonths = n * 12;

    // Buying costs
    const transferTax = price * transferTaxRate;
    const upfrontCosts = downPayment + transferTax + price * 0.01; // + ~1% closing fees
    const totalMortgagePayments = monthlyMortgage * compareMonths;
    const ongoingCosts = price * 0.01 * n; // ~1% p.a. maintenance/insurance
    const totalBuyingCashOut = upfrontCosts + totalMortgagePayments + ongoingCosts;

    // Loan balance remaining after N years
    const remainingBalance = loanAmount * (Math.pow(1 + rate, termMonths) - Math.pow(1 + rate, compareMonths)) / (Math.pow(1 + rate, termMonths) - 1);

    // Home value after N years
    const homeValue = price * Math.pow(1 + appRate, n);
    const equity = homeValue - Math.max(0, remainingBalance);

    // Net buying cost = total cash out - equity gained
    const netBuyingCost = totalBuyingCashOut - equity;

    // Renting costs
    const totalRentingCost = rent * compareMonths;

    const diff = netBuyingCost - totalRentingCost;

    setResult({
      monthlyMortgage,
      downPayment,
      totalBuyingCashOut,
      homeValue,
      equity,
      netBuyingCost,
      totalRentingCost,
      diff,
      n,
      buyingWins: diff < 0,
    });
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Property</span>
              <h1 className="text-6xl md:text-8xl mb-8">Rent vs<br />Buy.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Compare the true total cost of renting versus buying a home over any time horizon.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Buying</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Home Purchase Price</label>
                    <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                      <input type="number" min="0" step="10000" value={homePrice} onChange={(e) => setHomePrice(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Down Payment</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="0" max="100" step="1" value={downPaymentPct} onChange={(e) => setDownPaymentPct(e.target.value)} placeholder="20"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Mortgage Rate (% p.a.)</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="0" max="30" step="0.1" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} placeholder="6.5"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Loan Term</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="1" max="40" step="1" value={loanTermYears} onChange={(e) => setLoanTermYears(e.target.value)} placeholder="30"
                        className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Expected Appreciation (% p.a.)</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="0" max="30" step="0.1" value={homeAppreciation} onChange={(e) => setHomeAppreciation(e.target.value)} placeholder="4"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Transfer / Stamp Duty (%)</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="0" max="20" step="0.1" value={transferTaxPct} onChange={(e) => setTransferTaxPct(e.target.value)} placeholder="4"
                        className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-muted mb-10">Renting</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Monthly Rent</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input type="number" min="0" step="50" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block italic">Comparison Period</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <input type="number" min="1" max="40" step="1" value={compareYears} onChange={(e) => setCompareYears(e.target.value)} placeholder="10"
                        className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                    <p className="text-xs text-text-dim mt-2 italic">Years to compare</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Compare Costs</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Comparison</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-4 italic">
                      {result.buyingWins ? 'Buying is cheaper' : 'Renting is cheaper'} over {result.n} years
                    </p>
                    <p className={`text-5xl font-black tracking-tighter ${result.buyingWins ? 'text-accent' : 'text-text-primary'}`}>
                      {formatCurrency(Math.abs(result.diff))}
                    </p>
                    <p className="text-xs text-text-dim mt-2 italic">
                      {result.buyingWins ? 'net advantage to buying' : 'net advantage to renting'}
                    </p>
                  </div>
                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div>
                      <p className="text-xs font-medium text-text-dim mb-1">Monthly Mortgage Payment</p>
                      <p className="text-xl font-bold">{formatCurrency(result.monthlyMortgage)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-1">Net Buying Cost</p>
                        <p className="text-lg font-bold">{formatCurrency(result.netBuyingCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-text-dim mb-1">Total Rent Paid</p>
                        <p className="text-lg font-bold">{formatCurrency(result.totalRentingCost)}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-line-soft">
                      <p className="text-xs font-medium text-text-dim mb-1">Home Value in {result.n}y</p>
                      <p className="text-lg font-bold text-accent">{formatCurrency(result.homeValue)}</p>
                      <p className="text-xs text-text-dim mt-1 italic">Equity: {formatCurrency(result.equity)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-serif italic text-text-dim leading-relaxed pt-4 border-t border-line-soft">
                    Includes your transfer/stamp duty rate and ~1% p.a. maintenance estimate. Results are indicative only.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">R/B</div>
                <p className="text-sm font-medium">Enter details to compare renting vs buying</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentVsBuy;
