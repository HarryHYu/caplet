import { useState } from 'react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Savings & Growth</span>
              <h1 className="text-6xl md:text-8xl mb-8">Inflation<br />Calculator.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                See how inflation erodes purchasing power — or inflates future costs — over time.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <h2 className="text-sm font-semibold text-text-muted mb-10">Mode</h2>
            <div className="flex gap-4 mb-16">
              {[
                { val: 'cost', label: 'Future cost of something' },
                { val: 'power', label: 'Purchasing power of savings' },
              ].map(({ val, label }) => (
                <button
                  key={val} type="button"
                  onClick={() => { setMode(val); setResult(null); }}
                  className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${mode === val ? 'border-accent bg-accent/10 text-accent' : 'border-line-soft text-text-muted hover:border-text-dim'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-4 block italic">
                  {mode === 'cost' ? 'Current Cost (AUD)' : 'Current Savings (AUD)'}
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Annual Inflation Rate (%)</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number" min="0" max="50" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="3.0"
                      className="w-full bg-transparent pr-8 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-0 bottom-2 text-text-dim font-bold text-sm">%</span>
                  </div>
                  <p className="text-xs text-text-dim mt-2 italic">AU long-run avg ≈ 3%</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Time Period</label>
                  <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                    <input
                      type="number" min="1" max="100" step="1" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Years"
                      className="w-full bg-transparent pr-4 py-2 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate</button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Inflation Impact</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div>
                    <p className="text-xs font-medium text-text-dim mb-4 italic">
                      {result.mode === 'cost' ? `Cost in ${result.n} years` : `Purchasing power in ${result.n} years`}
                    </p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">{formatCurrency(result.value)}</p>
                  </div>
                  <div className="pt-10 border-t border-line-soft space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-1">Today's Value</p>
                        <p className="text-xl font-bold">{formatCurrency(result.original)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-text-dim mb-1">{result.mode === 'cost' ? 'Price Increase' : 'Value Lost'}</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.diff)}</p>
                      </div>
                    </div>
                    <div className="pt-8 border-t border-line-soft">
                      <p className="text-xs font-medium text-text-dim mb-2">
                        {result.mode === 'cost'
                          ? `At ${result.r}% inflation over ${result.n} years, prices rise ${(((result.value / result.original) - 1) * 100).toFixed(1)}%.`
                          : `At ${result.r}% inflation, your money loses ${((result.diff / result.original) * 100).toFixed(1)}% of its purchasing power.`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">CPI</div>
                <p className="text-sm font-medium">Enter values to see inflation impact</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InflationCalculator;
