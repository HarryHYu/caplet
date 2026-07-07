import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const BreakEven = () => {
  const [fixedCosts, setFixedCosts] = useState('');
  const [variableCost, setVariableCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [targetProfit, setTargetProfit] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const FC = parseFloat(fixedCosts) || 0;
    const VC = parseFloat(variableCost) || 0;
    const SP = parseFloat(sellingPrice) || 0;
    const TP = parseFloat(targetProfit) || 0;

    if (FC <= 0 || SP <= 0) {
      setResult({ error: 'Please enter valid fixed costs and selling price.' });
      return;
    }
    if (SP <= VC) {
      setResult({ error: 'Selling price must be greater than variable cost per unit.' });
      return;
    }

    const contributionMargin = SP - VC;
    const contributionMarginPct = (contributionMargin / SP) * 100;
    const breakEvenUnits = Math.ceil(FC / contributionMargin);
    const breakEvenRevenue = breakEvenUnits * SP;
    const unitsForProfit = TP > 0 ? Math.ceil((FC + TP) / contributionMargin) : null;
    const revenueForProfit = unitsForProfit ? unitsForProfit * SP : null;

    setResult({ contributionMargin, contributionMarginPct, breakEvenUnits, breakEvenRevenue, unitsForProfit, revenueForProfit, TP });
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-20 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-2xl text-accent">Tools, Business</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-2 mb-8">Break-Even<br />Calculator.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Find out exactly how many units you need to sell before you start making money.
              </p>
            </div>
            <Link to="/fintools" className="btn-secondary text-sm px-8">Back to Tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-12">Cost and Revenue Structure</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-4 block">Fixed Costs (per period)</label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input type="number" min="0" step="100" value={fixedCosts} onChange={(e) => setFixedCosts(e.target.value)} placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                </div>
                <p className="text-xs text-text-dim mt-2">Rent, salaries, software, insurance. Costs that don't change with output.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block">Variable Cost per Unit</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={variableCost} onChange={(e) => setVariableCost(e.target.value)} placeholder="0.00"
                      className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                  </div>
                  <p className="text-xs text-text-dim mt-2">Materials, packaging, commissions per unit.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block">Selling Price per Unit</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00"
                      className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                  </div>
                </div>
              </div>
              <div className="max-w-xs">
                <label className="text-sm font-semibold text-text-dim mb-4 block">Target Profit (optional)</label>
                <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                  <input type="number" min="0" step="100" value={targetProfit} onChange={(e) => setTargetProfit(e.target.value)} placeholder="0"
                    className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                </div>
                <p className="text-xs text-text-dim mt-2">Shows units needed for this profit.</p>
              </div>
              <button type="submit" className="btn-primary w-full py-5 text-sm">Calculate Break-Even</button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue rounded-3xl p-10 lg:p-16 flex flex-col min-h-full relative overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-12 relative z-10">Break-Even Analysis</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-4">Break-Even Units</p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {result.breakEvenUnits.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-dim mt-2">Units per period</p>
                  </div>
                  <div className="pt-10 border-t border-line-soft/60 space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">Break-Even Revenue</p>
                        <p className="text-xl font-bold">{formatCurrency(result.breakEvenRevenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Contribution Margin</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.contributionMargin)}/unit</p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <p className="text-xs font-semibold text-text-dim mb-2">Contribution Margin %</p>
                      <p className="text-2xl font-bold">{result.contributionMarginPct.toFixed(1)}%</p>
                      <p className="text-xs text-text-dim mt-1">The share of each sale that covers fixed costs.</p>
                    </div>
                    {result.unitsForProfit && (
                      <div className="pt-8 border-t border-line-soft/60">
                        <p className="text-xs font-semibold text-text-dim mb-2">Units for {formatCurrency(result.TP)} profit</p>
                        <p className="text-2xl font-bold">{result.unitsForProfit.toLocaleString()} units</p>
                        <p className="text-xs text-text-dim mt-1">Revenue: {formatCurrency(result.revenueForProfit)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-sm font-black mb-8">BEP</div>
                <p className="text-sm font-medium text-text-muted">Enter your cost structure to calculate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakEven;
