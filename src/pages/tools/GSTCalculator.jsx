import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';

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

  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-16 reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="font-hand text-accent text-lg">Australian tax helper</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-2 mb-6">
                GST Calculator
              </h1>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Add or remove 10% goods and services tax with statutory precision.
              </p>
            </div>
            <Link to="/tools" className="btn-secondary text-sm px-8">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-surface-raised p-10 lg:p-14 rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Transaction Details</h2>
            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <label className="text-sm font-semibold text-text-dim mb-3 block">
                  Amount (AUD)
                </label>
                <div className="relative flex items-center bg-surface-body rounded-xl border border-line-soft focus-within:border-accent transition-colors">
                  <span className="pl-5 text-text-dim font-bold text-2xl">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-3 pr-5 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-text-dim mb-4 block">
                  Calculation Mode
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  {[
                    { id: 'add', label: 'Add GST' },
                    { id: 'remove', label: 'Remove GST' }
                  ].map((type) => (
                    <label key={type.id} className={`flex-1 flex items-center gap-3 cursor-pointer rounded-xl px-5 py-4 transition-all ${calculationType === type.id ? 'bg-accent text-white shadow-[0_16px_30px_-22px_rgba(20,20,18,0.4)]' : 'bg-surface-body hover:-translate-y-0.5 transition-transform'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${calculationType === type.id ? 'bg-white' : 'border-2 border-line-soft'}`}>
                        {calculationType === type.id && <div className="w-2 h-2 bg-accent rounded-full" />}
                      </div>
                      <input
                        type="radio"
                        name="type"
                        value={type.id}
                        checked={calculationType === type.id}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="hidden"
                      />
                      <span className={`text-sm font-bold ${calculationType === type.id ? 'text-white' : 'text-text-dim'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-5 text-base mt-2 hover:-translate-y-0.5 transition-transform">
                Calculate GST
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 block-blue p-10 lg:p-14 flex flex-col min-h-full rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-10">Results</h2>

            {result ? (
              result.error ? (
                <p className="text-sm font-semibold text-accent">{result.error}</p>
              ) : (
                <div className="space-y-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-text-muted mb-1">Original amount</p>
                      <p className="text-2xl font-bold tracking-tight">{formatCurrency(result.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-muted mb-1">GST (10%)</p>
                      <p className="text-2xl font-bold tracking-tight">{formatCurrency(result.gst)}</p>
                    </div>
                  </div>

                  <div className="bg-surface-raised rounded-2xl px-6 py-5 shadow-[0_16px_30px_-26px_rgba(20,20,18,0.35)]">
                    <p className="text-sm font-bold text-accent mb-2">
                      {result.type === 'add' ? 'Total with GST' : 'Amount before GST'}
                    </p>
                    <p className="text-5xl font-black tracking-tight text-text-primary">
                      {formatCurrency(result.type === 'add' ? result.total : result.base)}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-base font-display font-extrabold text-accent mb-6 shadow-[0_16px_30px_-26px_rgba(20,20,18,0.35)]">GST</div>
                <p className="text-sm font-medium text-text-muted">Enter an amount to see your results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTCalculator;

