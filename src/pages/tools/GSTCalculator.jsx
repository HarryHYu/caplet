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
    <div className="minimal-page !min-h-0 pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Australian tax helper</span>
              <h1 className="minimal-page-title">GST Calculator</h1>
              <p className="minimal-page-description">
                Add or remove 10% goods and services tax with statutory precision.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">
              &larr; Back to Tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Transaction Details</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="gst-amount" className="text-sm font-semibold text-text-dim mb-3 block">
                  Amount (AUD)
                </label>
                <div className="relative flex items-center bg-surface-body rounded-xl border border-line-soft focus-within:border-accent transition-colors">
                  <span className="pl-5 text-text-dim font-bold text-2xl">$</span>
                  <input id="gst-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    data-control-unstyled
                    className="w-full bg-transparent pl-3 pr-5 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/30"
                  />
                </div>
              </div>

              <div>
                <span id="gst-mode-label" className="text-sm font-semibold text-text-dim mb-4 block">
                  Calculation Mode
                </span>
                <div role="radiogroup" aria-labelledby="gst-mode-label" className="flex flex-col sm:flex-row gap-4">
                  {[
                    { id: 'add', label: 'Add GST' },
                    { id: 'remove', label: 'Remove GST' }
                  ].map((type) => (
                    <label key={type.id} className={`flex-1 flex items-center gap-3 cursor-pointer rounded-xl px-5 py-4 transition-all ${calculationType === type.id ? 'bg-accent text-accent-contrast shadow-pop' : 'bg-surface-body press'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${calculationType === type.id ? 'bg-accent-contrast' : 'border-2 border-line-soft'}`}>
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
                      <span className={`text-sm font-bold ${calculationType === type.id ? 'text-accent-contrast' : 'text-text-dim'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary press w-full py-5 text-base mt-2 press">
                Calculate GST
              </button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl mb-6">Results</h2>

            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="animate-rise space-y-6">
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

                  <div className="bg-surface-raised rounded-2xl px-6 py-5 shadow-pop">
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
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-base font-display font-extrabold text-accent mb-6 shadow-pop">GST</div>
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

