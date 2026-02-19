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
      // Add GST to amount
      const gst = amountNum * GST_RATE;
      const total = amountNum + gst;
      setResult({
        originalAmount: amountNum,
        gst,
        total,
        type: 'add',
      });
    } else {
      // Remove GST from amount (GST inclusive)
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
    <div className="min-h-screen py-24 page-section-light">
      <section className="border-b border-zinc-100 dark:border-zinc-900 mb-20 pb-20">
        <div className="container-custom">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8 animate-slide-up">
              <div>
                <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-4">
                  Financial Tools
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  GST <br />Calculator.
                </h1>
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                  Calculate Australian Goods and Services Tax (10%) on any amount.
                </p>
              </div>
              <Link to="/tools" className="text-[10px] font-black text-zinc-400 hover:text-brand uppercase tracking-widest transition-colors mb-auto">
                ← Back to Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="lg:col-span-2 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 p-10 reveal-up">
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-8">Calculate GST</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">
                    Transaction Value (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="E.G. 1000.00"
                    className="w-full px-6 py-4 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-black dark:text-white font-black text-[11px] uppercase tracking-widest focus:border-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4 italic">
                    Calculation Type
                  </label>
                  <div className="flex gap-8">
                    <label className="flex items-center group cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="add"
                        checked={calculationType === 'add'}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="w-4 h-4 accent-brand"
                      />
                      <span className="ml-3 text-[10px] font-black text-zinc-500 group-hover:text-black dark:group-hover:text-white uppercase tracking-widest transition-colors">Apply GST</span>
                    </label>
                    <label className="flex items-center group cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="remove"
                        checked={calculationType === 'remove'}
                        onChange={(e) => setCalculationType(e.target.value)}
                        className="w-4 h-4 accent-brand"
                      />
                      <span className="ml-3 text-[10px] font-black text-zinc-500 group-hover:text-black dark:group-hover:text-white uppercase tracking-widest transition-colors">Extract GST</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all active:scale-[0.98]"
                >
                  Calculate
                </button>
              </form>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 reveal-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-10">Results</h2>
              {result ? (
                result.error ? (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{result.error}</p>
                ) : (
                  <div className="space-y-8">
                    {result.type === 'add' ? (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Base Principal</p>
                          <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                            {formatCurrency(result.originalAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Tax Levy (10%)</p>
                          <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                            {formatCurrency(result.gst)}
                          </p>
                        </div>
                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                          <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1 italic">Gross Total</p>
                          <p className="text-3xl font-extrabold text-brand tracking-tighter">
                            {formatCurrency(result.total)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Gross Principal</p>
                          <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                            {formatCurrency(result.originalAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Extracted Levy</p>
                          <p className="text-xl font-extrabold text-black dark:text-white tracking-tighter">
                            {formatCurrency(result.gst)}
                          </p>
                        </div>
                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                          <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1 italic">Net Value</p>
                          <p className="text-3xl font-extrabold text-brand tracking-tighter">
                            {formatCurrency(result.base)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <span className="w-1.5 h-1.5 bg-zinc-200 dark:bg-zinc-800 mb-4" />
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                    Enter values to calculate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GSTCalculator;

