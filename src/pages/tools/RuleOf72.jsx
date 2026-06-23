import { useState } from 'react';
import { Link } from 'react-router-dom';

const RuleOf72 = () => {
  const [mode, setMode] = useState('rate-to-years'); // or 'years-to-rate'
  const [rateInput, setRateInput] = useState('');
  const [yearsInput, setYearsInput] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'rate-to-years') {
      const rate = parseFloat(rateInput) || 0;
      if (rate <= 0) { setResult({ error: 'Enter a positive interest rate.' }); return; }
      const years = 72 / rate;
      const exactYears = Math.log(2) / Math.log(1 + rate / 100);
      setResult({ years, exactYears, rate, mode });
    } else {
      const years = parseFloat(yearsInput) || 0;
      if (years <= 0) { setResult({ error: 'Enter a positive number of years.' }); return; }
      const rate = 72 / years;
      const exactRate = (Math.pow(2, 1 / years) - 1) * 100;
      setResult({ years, rate, exactRate, mode });
    }
  };

  const examples = [
    { rate: 4, label: 'Savings account (4%)' },
    { rate: 7, label: 'Stock market (7%)' },
    { rate: 10, label: 'High-growth equity (10%)' },
    { rate: 20, label: 'Credit card debt (20%)' },
  ];

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Tools &rarr; Savings & Growth</span>
              <h1 className="text-6xl md:text-8xl mb-8">Rule of 72.</h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Divide 72 by an interest rate to find how many years it takes to double your money — or vice versa.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">&larr; Back to tools</Link>
          </div>
          <div className="h-px w-full bg-line-soft" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1">
          <div className="lg:col-span-7 bg-surface-body p-12 lg:p-20">
            <div className="mb-16">
              <h2 className="text-sm font-semibold text-text-muted mb-6">Mode</h2>
              <div className="flex gap-4">
                {[
                  { val: 'rate-to-years', label: 'Rate → Years to double' },
                  { val: 'years-to-rate', label: 'Years → Required rate' },
                ].map(({ val, label }) => (
                  <button key={val} type="button" onClick={() => { setMode(val); setResult(null); }}
                    className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${mode === val ? 'border-accent bg-accent/10 text-accent' : 'border-line-soft text-text-muted hover:border-text-dim'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-16">
              {mode === 'rate-to-years' ? (
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Annual Interest / Growth Rate</label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <input type="number" min="0.1" max="100" step="0.1" value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder="0.0"
                      className="w-full bg-transparent pr-8 py-4 text-4xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                    <span className="absolute right-0 bottom-4 text-text-dim font-bold text-xl">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-text-dim mb-4 block italic">Years to Double Your Money</label>
                  <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                    <input type="number" min="0.5" max="200" step="0.5" value={yearsInput} onChange={(e) => setYearsInput(e.target.value)} placeholder="0"
                      className="w-full bg-transparent pr-4 py-4 text-4xl font-bold text-text-primary outline-none placeholder:text-text-dim/20" />
                  </div>
                </div>
              )}
              <button type="submit" className="btn-primary w-full py-6 text-sm">Calculate</button>
            </form>

            <div className="mt-16 pt-16 border-t border-line-soft">
              <h3 className="text-xs font-semibold text-text-dim mb-8 italic">Quick Reference</h3>
              <div className="grid grid-cols-2 gap-3">
                {examples.map(({ rate, label }) => (
                  <div key={rate} className="border border-line-soft rounded-lg p-4 text-sm">
                    <p className="font-semibold text-text-primary">{label}</p>
                    <p className="text-text-muted mt-1">Doubles in <span className="font-bold text-accent">{(72 / rate).toFixed(1)} yrs</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical pointer-events-none" />
            <h2 className="text-sm font-semibold text-text-muted mb-16 relative z-10">Result</h2>
            {result ? (
              result.error ? (
                <p className="text-sm font-medium text-accent relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  {result.mode === 'rate-to-years' ? (
                    <>
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-4 italic">Years to double at {result.rate}%</p>
                        <p className="text-5xl font-black tracking-tighter text-text-primary">{result.years.toFixed(1)}</p>
                        <p className="text-sm text-text-dim mt-2">years (Rule of 72)</p>
                      </div>
                      <div className="pt-10 border-t border-line-soft">
                        <p className="text-xs font-medium text-text-dim mb-2">Exact calculation</p>
                        <p className="text-2xl font-bold">{result.exactYears.toFixed(2)} years</p>
                        <p className="text-xs text-text-dim mt-1 italic">Using ln(2)/ln(1+r)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-medium text-text-dim mb-4 italic">Rate needed to double in {result.years} years</p>
                        <p className="text-5xl font-black tracking-tighter text-text-primary">{result.rate.toFixed(2)}%</p>
                        <p className="text-sm text-text-dim mt-2">p.a. (Rule of 72)</p>
                      </div>
                      <div className="pt-10 border-t border-line-soft">
                        <p className="text-xs font-medium text-text-dim mb-2">Exact required rate</p>
                        <p className="text-2xl font-bold">{result.exactRate.toFixed(2)}% p.a.</p>
                        <p className="text-xs text-text-dim mt-1 italic">Using 2^(1/n) − 1</p>
                      </div>
                    </>
                  )}
                  <div className="pt-8 border-t border-line-soft">
                    <p className="text-xs font-serif italic text-text-dim leading-relaxed">
                      The Rule of 72 is a mental shortcut — accurate within 1–2% for rates between 2% and 20%.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-16 h-16 border border-line-soft flex items-center justify-center text-2xl font-black font-serif mb-8">72</div>
                <p className="text-sm font-medium">Enter a rate or time period above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleOf72;
