import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  '$' + new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value));

// Returns the total Australian income tax on `income` using bracket-stacking.
// The thresholds use continuous ranges (0→18200, 18200→45000…) so there are
// no gaps between brackets.
const TAX_THRESHOLDS = [
  { from: 0,      to: 18200,    rate: 0 },
  { from: 18200,  to: 45000,    rate: 0.19 },
  { from: 45000,  to: 120000,   rate: 0.325 },
  { from: 120000, to: 180000,   rate: 0.37 },
  { from: 180000, to: Infinity, rate: 0.45 },
];

const calculateTax = (income) => {
  if (income <= 0) return 0;
  let tax = 0;
  for (const { from, to, rate } of TAX_THRESHOLDS) {
    if (income <= from) break;
    tax += (Math.min(income, to) - from) * rate;
  }
  return tax;
};

const CapitalGains = () => {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [purchaseCosts, setPurchaseCosts] = useState('');
  const [saleCosts, setSaleCosts] = useState('');
  const [heldOver12m, setHeldOver12m] = useState(true);
  const [otherIncome, setOtherIncome] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const PP = parseFloat(purchasePrice) || 0;
    const SP = parseFloat(salePrice) || 0;
    const PC = parseFloat(purchaseCosts) || 0;
    const SC = parseFloat(saleCosts) || 0;
    const OI = parseFloat(otherIncome) || 0;

    if (PP <= 0 || SP <= 0) {
      setResult({ error: 'Please enter valid purchase and sale prices.' });
      return;
    }

    const costBase = PP + PC;
    const netProceeds = SP - SC;
    const grossGain = netProceeds - costBase;

    if (grossGain <= 0) {
      const capitalLoss = Math.abs(grossGain);
      setResult({ isLoss: true, capitalLoss, costBase, netProceeds });
      return;
    }

    const discountedGain = heldOver12m ? grossGain * 0.5 : grossGain;
    const taxableIncome = OI + discountedGain;
    const marginalRate = TAX_THRESHOLDS.find((b) => taxableIncome <= b.to)?.rate ?? 0.45;
    // Bracket-differential: tax attributable to the gain only
    const taxOnGain = calculateTax(OI + discountedGain) - calculateTax(OI);
    const effectiveRate = (taxOnGain / grossGain) * 100;

    setResult({
      isLoss: false,
      grossGain,
      discountedGain,
      heldOver12m,
      taxOnGain,
      effectiveRate,
      marginalRate,
      costBase,
      netProceeds,
    });
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-20 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-2xl text-accent">Tax &amp; income</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-3 mb-8">Capital Gains<br />Estimator.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Estimate CGT on the sale of shares, property, or other assets under Australian tax rules.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-surface-raised p-10 lg:p-16 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-10">Asset Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block">Purchase Price</label>
                    <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                      <input type="number" min="0" step="100" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block">Sale Price</label>
                    <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                      <input type="number" min="0" step="100" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-10">Costs (optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block">Acquisition Costs</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input type="number" min="0" step="10" value={purchaseCosts} onChange={(e) => setPurchaseCosts(e.target.value)} placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                    <p className="text-xs text-text-dim mt-2">Stamp duty, legal fees, brokerage</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-dim mb-4 block">Disposal Costs</label>
                    <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                      <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                      <input type="number" min="0" step="10" value={saleCosts} onChange={(e) => setSaleCosts(e.target.value)} placeholder="0"
                        className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    </div>
                    <p className="text-xs text-text-dim mt-2">Agent fees, brokerage on sale</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block">Other Annual Income</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <span className="absolute left-0 bottom-2 text-text-dim font-bold text-sm">$</span>
                    <input type="number" min="0" step="1000" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} placeholder="0"
                      className="w-full bg-transparent pl-6 pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                  </div>
                  <p className="text-xs text-text-dim mt-2">Used to determine marginal tax rate</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-6 block">Holding Period</label>
                  <div className="flex gap-4">
                    {[
                      { val: true, label: '12+ months' },
                      { val: false, label: 'Under 12 months' },
                    ].map(({ val, label }) => (
                      <button key={String(val)} type="button" onClick={() => setHeldOver12m(val)}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${heldOver12m === val ? 'bg-accent text-white' : 'bg-surface-body text-text-muted hover:text-text-primary'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-dim mt-2">{heldOver12m ? '50% CGT discount applies' : 'No discount, full gain is taxable'}</p>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm hover:-translate-y-0.5 transition-transform">Estimate Capital Gains Tax</button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue p-10 lg:p-16 flex flex-col min-h-full relative overflow-hidden rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-12 relative z-10">CGT Estimate</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : result.isLoss ? (
                <div className="space-y-10 relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-4">Capital Loss</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-red-500">{formatCurrency(result.capitalLoss)}</p>
                  </div>
                  <div className="bg-surface-raised/70 rounded-2xl p-6">
                    <p className="text-sm text-text-muted">No CGT is payable on a capital loss. This loss can be offset against future capital gains.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-4">Estimated CGT Payable</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">{formatCurrency(result.taxOnGain)}</p>
                  </div>
                  <div className="bg-surface-raised/70 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">Gross Capital Gain</p>
                        <p className="text-xl font-bold">{formatCurrency(result.grossGain)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Taxable Gain</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.discountedGain)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">Marginal Rate Applied</p>
                        <p className="text-2xl font-bold">{(result.marginalRate * 100).toFixed(0)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Effective Rate On Gross Gain</p>
                        <p className="text-2xl font-bold">{result.effectiveRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    {result.heldOver12m && (
                      <p className="text-xs font-semibold text-accent">50% CGT discount applied</p>
                    )}
                  </div>
                  <p className="text-xs text-text-dim leading-relaxed">
                    Australian individual tax rates. Excludes Medicare levy and offsets. Consult a tax professional.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-xs font-display font-bold mb-8">CGT</div>
                <p className="text-sm font-semibold text-text-muted">Enter your asset details above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalGains;
