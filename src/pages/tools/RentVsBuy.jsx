import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { formatWholeCurrencyAUD as formatCurrency, parseNonNegative, parsePositive, rentVsBuyComparison } from './toolMath';

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
    // Every parsed field is validated with Number.isFinite: an empty mortgage
    // rate used to become NaN, pass the `<= 0` guard and render "$NaN".
    const price = parsePositive(homePrice);
    const dpPct = parseNonNegative(downPaymentPct);
    const rate = parsePositive(mortgageRate);
    const term = parsePositive(loanTermYears);
    const rent = parsePositive(monthlyRent);
    const n = parsePositive(compareYears);
    const appRate = parseNonNegative(homeAppreciation) ?? 0;
    const transferTaxRate = parseNonNegative(transferTaxPct) ?? 0;

    if (price === null || dpPct === null || rate === null || term === null || rent === null || n === null) {
      setResult({ error: 'Please fill in all required fields.' });
      return;
    }

    setResult(rentVsBuyComparison({
      homePrice: price,
      downPaymentPct: dpPct,
      mortgageRatePct: rate,
      loanTermYears: term,
      monthlyRent: rent,
      compareYears: n,
      homeAppreciationPct: appRate,
      transferTaxPct: transferTaxRate,
    }));
  };

  useReveal();

  return (
    <div className="minimal-page pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Property</span>
              <h1 className="minimal-page-title">Rent vs Buy.</h1>
              <p className="minimal-page-description">
                Compare the true total cost of renting versus buying a home over any time horizon.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">Back to Tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Buying</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label htmlFor="rvb-home-price" className="text-sm font-semibold text-text-dim mb-3 block">Home Purchase Price</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                      <input id="rvb-home-price" type="number" min="0" step="10000" value={homePrice} onChange={(e) => setHomePrice(e.target.value)} placeholder="0.00"
                        data-control-unstyled
                        className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rvb-down-payment" className="text-sm font-semibold text-text-dim mb-3 block">Down Payment</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-down-payment" type="number" min="0" max="100" step="1" value={downPaymentPct} onChange={(e) => setDownPaymentPct(e.target.value)} placeholder="20"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label htmlFor="rvb-mortgage-rate" className="text-sm font-semibold text-text-dim mb-3 block">Mortgage Rate (% p.a.)</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-mortgage-rate" type="number" min="0" max="30" step="0.1" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} placeholder="6.5"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rvb-loan-term" className="text-sm font-semibold text-text-dim mb-3 block">Loan Term</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-loan-term" type="number" min="1" max="40" step="1" value={loanTermYears} onChange={(e) => setLoanTermYears(e.target.value)} placeholder="30"
                        data-control-unstyled
                        className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rvb-appreciation" className="text-sm font-semibold text-text-dim mb-3 block">Expected Appreciation (% p.a.)</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-appreciation" type="number" min="0" max="30" step="0.1" value={homeAppreciation} onChange={(e) => setHomeAppreciation(e.target.value)} placeholder="4"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rvb-transfer-tax" className="text-sm font-semibold text-text-dim mb-3 block">Transfer / Stamp Duty (%)</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-transfer-tax" type="number" min="0" max="20" step="0.1" value={transferTaxPct} onChange={(e) => setTransferTaxPct(e.target.value)} placeholder="4"
                        data-control-unstyled
                        className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Renting</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label htmlFor="rvb-monthly-rent" className="text-sm font-semibold text-text-dim mb-3 block">Monthly Rent</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">$</span>
                      <input id="rvb-monthly-rent" type="number" min="0" step="50" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="0"
                        data-control-unstyled
                        className="w-full bg-transparent pl-9 pr-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rvb-compare-years" className="text-sm font-semibold text-text-dim mb-3 block">Comparison Period</label>
                    <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                      <input id="rvb-compare-years" type="number" min="1" max="40" step="1" value={compareYears} onChange={(e) => setCompareYears(e.target.value)} placeholder="10"
                        data-control-unstyled
                        className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                    <p className="text-xs text-text-dim mt-2">Years to compare</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary press w-full py-5 press">Compare Costs</button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-8">Comparison</h2>
            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="animate-rise space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-4">
                      {result.buyingWins ? 'Buying is cheaper' : 'Renting is cheaper'} over {result.n} years
                    </p>
                    <p className={`text-5xl font-black tracking-tight ${result.buyingWins ? 'text-accent' : 'text-text-primary'}`}>
                      {formatCurrency(Math.abs(result.diff))}
                    </p>
                    <p className="text-xs text-text-dim mt-2">
                      {result.buyingWins ? 'Net advantage to buying' : 'Net advantage to renting'}
                    </p>
                  </div>
                  <div className="bg-surface-raised rounded-2xl p-6 space-y-6">
                    <div>
                      <p className="text-xs font-semibold text-text-dim mb-1">Monthly Mortgage Payment</p>
                      <p className="text-xl font-bold">{formatCurrency(result.monthlyMortgage)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">Net Buying Cost</p>
                        <p className="text-lg font-bold">{formatCurrency(result.netBuyingCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Total Rent Paid</p>
                        <p className="text-lg font-bold">{formatCurrency(result.totalRentingCost)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-dim mb-1">Home Value in {result.n}y</p>
                      <p className="text-lg font-bold text-accent">{formatCurrency(result.homeValue)}</p>
                      <p className="text-xs text-text-dim mt-1">Equity: {formatCurrency(result.equity)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-dim leading-relaxed">
                    Includes your transfer or stamp duty rate and a roughly 1% p.a. maintenance estimate. Results are indicative only.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center text-xs font-bold mb-8">R/B</div>
                <p className="text-sm font-medium text-text-muted">Enter details to compare renting vs buying.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentVsBuy;
