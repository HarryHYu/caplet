import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

const GSTCalculator = () => {
  const [amount, setAmount] = useState('');
  const [calculationType, setCalculationType] = useState('add'); // 'add' or 'remove'
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount) || 0;

    if (amountNum <= 0) {
      setResult({ error: 'Please enter a valid amount.' });
      return;
    }

    const GST_RATE = 0.10; // 10% GST in Australia

    if (calculationType === 'add') {
      const gst = amountNum * GST_RATE;
      const total = amountNum + gst;
      setResult({
        originalAmount: amountNum,
        gst,
        total,
        type: 'add',
      });
    } else {
      const gst = amountNum * (GST_RATE / (1 + GST_RATE));
      const base = amountNum - gst;
      setResult({
        originalAmount: amountNum,
        gst,
        base,
        type: 'remove',
      });
    }
  };

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <span className="section-kicker">Instruments &rarr; Compliance</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                GST<br />Nexus.
              </h1>
              <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
                Execute goods and services tax transformations with 10% statutory precision for the Australian jurisdiction.
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
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16">Transaction Parameters</h2>
            <form onSubmit={handleSubmit} className="space-y-16">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block italic">
                  Value Registry (AUD)
                </label>
                <div className="relative border-b-2 border-line-soft focus-within:border-accent transition-colors">
                  <span className="absolute left-0 bottom-4 text-text-dim font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-8 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-8 block italic">
                  Operator Mode
                </label>
                <div className="flex gap-12">
                  {[
                    { id: 'add', label: 'Apply Levy' },
                    { id: 'remove', label: 'Extract Levy' }
                  ].map((type) => (
                    <label key={type.id} className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${calculationType === type.id ? 'border-accent bg-accent' : 'border-line-soft group-hover:border-text-dim'}`}>
                        {calculationType === type.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <input
                        type="radio"
                        name="type"
                        value={type.id}
                        checked={calculationType === type.id}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="hidden"
                      />
                      <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${calculationType === type.id ? 'text-text-primary' : 'text-text-dim group-hover:text-text-muted'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] mt-8">
                Confirm Transformation
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16 relative z-10">Output Log</h2>

            {result ? (
              result.error ? (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest relative z-10">{result.error}</p>
              ) : (
                <div className="space-y-12 relative z-10">
                  <div className="space-y-8">
                    <div>
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-2 italic">Principal Input</p>
                      <p className="text-2xl font-bold tracking-tight">{formatCurrency(result.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mb-2 italic">Tax Derivative (10%)</p>
                      <p className="text-2xl font-bold tracking-tight">{formatCurrency(result.gst)}</p>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-line-soft">
                    <p className="text-[9px] font-bold text-accent uppercase tracking-[0.4em] mb-4">
                      {result.type === 'add' ? 'Gross Aggregation' : 'Net Extraction'}
                    </p>
                    <p className="text-5xl font-black tracking-tighter text-text-primary">
                      {formatCurrency(result.type === 'add' ? result.total : result.base)}
                    </p>
                  </div>

                  <div className="pt-12 border-t border-line-soft">
                    <p className="text-[10px] font-serif italic text-text-dim leading-relaxed">
                      "Taxation is the price which we pay for civilization, for our social, civil and political institutions."
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
                <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">GST</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Awaiting Economic Event</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTCalculator;

