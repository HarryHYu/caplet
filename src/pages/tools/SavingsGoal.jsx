import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/useReveal';
import { formatCurrencyAUD as formatCurrency, savingsGoalTimeline } from './toolMath';

const SavingsGoal = () => {
  const [goal, setGoal] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [interestRate, setInterestRate] = useState('3.5');
  const [result, setResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const goalNum = parseFloat(goal) || 0;
    const currentNum = parseFloat(currentSavings) || 0;
    const monthlyNum = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(interestRate) || 0;

    if (goalNum <= currentNum) {
      setResult({ error: 'Goal amount must be greater than current savings.' });
      return;
    }

    if (monthlyNum <= 0 && rate <= 0) {
      setResult({ error: 'Please enter a monthly contribution or interest rate.' });
      return;
    }

    const timeline = savingsGoalTimeline({
      goal: goalNum,
      current: currentNum,
      monthly: monthlyNum,
      annualRate: rate,
    });

    if (!timeline.reachable) {
      // e.g. $0 saved and no contributions — interest alone can never get
      // there, so never print "Infinity months".
      setResult({ error: 'With no savings yet and no monthly contribution, interest alone cannot reach this goal. Add a regular contribution.' });
      return;
    }

    setResult(timeline);
  };

  useReveal();

  return (
    <div className="minimal-page !min-h-0 pb-10 selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="section-kicker">Savings goal</span>
              <h1 className="minimal-page-title">Reach your <span className="hl-swipe hl-blue">target</span>.</h1>
              <p className="minimal-page-description">
                Set a savings goal and see how long it takes to get there.
              </p>
            </div>
            <Link to="/money/tools" className="btn-secondary text-sm px-8">
              &larr; Back to tools
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 surface-card md:p-8 card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-lg mb-6">Your numbers</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="savings-goal-target" className="text-sm font-semibold text-text-dim mb-4 block">
                    Target Amount (AUD)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      id="savings-goal-target"
                      type="number"
                      min="0"
                      step="100"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="0.00"
                      data-control-unstyled
                      className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="savings-goal-current" className="text-sm font-semibold text-text-dim mb-4 block">
                    Current Savings
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">$</span>
                    <input
                      id="savings-goal-current"
                      type="number"
                      min="0"
                      step="100"
                      value={currentSavings}
                      onChange={(e) => setCurrentSavings(e.target.value)}
                      placeholder="0.00"
                      data-control-unstyled
                      className="w-full bg-transparent pl-10 pr-4 py-4 text-2xl font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label htmlFor="savings-goal-monthly" className="text-sm font-semibold text-text-dim mb-4 block">
                    Monthly Contribution
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      id="savings-goal-monthly"
                      type="number"
                      min="0"
                      step="50"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="0.00"
                      data-control-unstyled
                      className="w-full bg-transparent px-4 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="savings-goal-rate" className="text-sm font-semibold text-text-dim mb-4 block">
                    Interest Rate (%)
                  </label>
                  <div className="relative rounded-xl border border-line-soft bg-surface-body focus-within:border-accent transition-colors">
                    <input
                      id="savings-goal-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.0"
                      data-control-unstyled
                      className="w-full bg-transparent pl-4 pr-10 py-3 text-lg font-bold text-text-primary outline-none placeholder:text-text-dim/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">%</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary press w-full py-5 text-base mt-4 press">
                Calculate Timeline
              </button>
            </form>
          </div>

          <div aria-live="polite" className="lg:col-span-5 lg:self-start lg:min-h-[19rem] surface-card block-blue md:p-8 flex flex-col card-lift reveal">
            <h2 className="font-display font-bold tracking-tight text-lg mb-6">Your projection</h2>

            {result ? (
              result.error ? (
                <p role="alert" className="text-sm font-semibold text-text-error">{result.error}</p>
              ) : (
                <div className="animate-rise space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-text-dim mb-3">Time to reach your goal</p>
                    <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                      {result.months} <span className="text-xl text-text-dim font-bold">months</span>
                    </p>
                    <p className="text-xs font-bold text-text-muted mt-3">About {result.years.toFixed(1)} years</p>
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-text-dim mb-1">You contribute</p>
                        <p className="text-xl font-bold">{formatCurrency(result.totalContributed)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-dim mb-1">Interest earned</p>
                        <p className="text-xl font-bold text-accent">{formatCurrency(result.interestEarned)}</p>
                      </div>
                    </div>

                    <div className="bg-surface-raised rounded-2xl p-7 shadow-pop">
                      <p className="text-xs font-semibold text-text-dim mb-3">Final balance</p>
                      <p className="font-display text-3xl font-extrabold tracking-tight">{formatCurrency(result.finalBalance)}</p>
                      <p className="mt-2 font-hand text-lg text-accent -rotate-2 inline-block">Goal reached.</p>
                    </div>

                    <p className="text-sm text-text-muted leading-relaxed">
                      Naming a goal is the first step toward reaching it. Seeing the timeline makes it real.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-sm font-display font-bold text-accent mb-6 shadow-pop">Goal</div>
                <p className="text-sm font-semibold text-text-muted">Enter your goal to see results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoal;

