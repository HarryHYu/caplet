import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const InflationCalculator = () => {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [mode, setMode] = useState('cost'); // 'cost' = future cost, 'power' = purchasing power
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const A = parseFloat(amount) || 0;
    const r = parseFloat(rate) || 0;
    const n = parseFloat(years) || 0;
    if (A <= 0 || r <= 0 || n <= 0) {
      setResult({ error: 'Please enter valid values for all fields.' });
      return;
    }
    const factor = Math.pow(1 + r / 100, n);
    if (mode === 'cost') {
      // What will X cost in N years?
      setResult({ label: 'Future Cost', value: A * factor, original: A, diff: A * factor - A, n, r, mode });
    } else {
      // What is today's X worth in N years (purchasing power)?
      setResult({ label: 'Future Purchasing Power', value: A / factor, original: A, diff: A - A / factor, n, r, mode });
    }
  };

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-xl">Tools, savings and growth</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-6 mt-2">Inflation<br />Calculator.</h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                See how inflation erodes purchasing power (or inflates future costs) over time.
              </p>
            </div>
            <Link to="/fintools" className="btn-secondary text-sm px-8 hover:-translate-y-0.5 transition-transform">&larr; Back to tools</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised rounded-3xl p-10 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-6">Mode</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              {[
                { val: 'cost', label: 'Future cost of something' },
                { val: 'power', label: 'Purchasing power of savings' },
              ].map(({ val, label }) => (
                <button
                  key={val} type="button"
                  onClick={() => { setMode(val); setResult(null); }}
                  className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-colors ${mode === val ? 'bg-accent text-white' : 'bg-block-cream text-text-muted hover:text-text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <label className="text-sm font-bold text-text-dim mb-3 block">
                  {mode === 'cost' ? 'Current Cost (AUD)' : 'Current Savings (AUD)'}
                </label>
                <div className="relative rounded-xl bg-block-cream border border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                  <input
                    type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-transparent pl-9 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div>
                  <label className="text-sm font-bold text-text-dim mb-3 block">Annual Inflation Rate (%)</label>
                  <div className="relative rounded-xl bg-block-cream border border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number" min="0" max="50" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="3.0"
                      className="w-full bg-transparent pl-4 pr-9 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p className="text-xs text-text-dim mt-2">AU long-run average is roughly 3%.</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-text-dim mb-3 block">Time Period</label>
                  <div className="relative rounded-xl bg-block-cream border border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number" min="1" max="100" step="1" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Years"
                      className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/40"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-4 hover:-translate-y-0.5 transition-transform">Calculate</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-block-blue rounded-3xl p-10 lg:p-16 flex flex-col min-h-full relative overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-lg text-text-primary mb-12 relative z-10">Inflation Impact</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-bold text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-10 relative z-10">
                  <div>
                    <p className="text-xs font-bold text-text-dim mb-3">
                      {result.mode === 'cost' ? `Cost in ${result.n} years` : `Purchasing power in ${result.n} years`}
                    </p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">{formatCurrency(result.value)}</p>
                  </div>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-text-dim mb-1">Today's Value</p>
                        <p className="text-xl font-bold">{formatCurrency(result.original)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-text-dim mb-1">{result.mode === 'cost' ? 'Price Increase' : 'Value Lost'}</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.diff)}</p>
                      </div>
                    </div>
                    <div className="bg-surface-raised rounded-2xl p-5">
                      <p className="text-xs font-medium text-text-muted">
                        {result.mode === 'cost'
                          ? `At ${result.r}% inflation over ${result.n} years, prices rise ${(((result.value / result.original) - 1) * 100).toFixed(1)}%.`
                          : `At ${result.r}% inflation, your money loses ${((result.diff / result.original) * 100).toFixed(1)}% of its purchasing power.`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-xs font-bold font-display mb-6">CPI</div>
                <p className="text-sm font-medium text-text-muted">Enter values to see inflation impact.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InflationCalculator;
