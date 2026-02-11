const FinancialPlan = ({ plan }) => {
  return (
    <div className="rounded-3xl border p-6 md:p-8" style={{ background: 'var(--surface-soft)', borderColor: 'var(--line-soft)' }}>
      <h2 className="text-2xl font-bold mb-8 md:mb-10" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        Strategic Financial Roadmap
      </h2>

      {/* Budget Allocation */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Budget Allocation
        </h3>
        {Object.keys(plan.budgetAllocation).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(plan.budgetAllocation).map(([category, amount]) => {
              const numAmount = typeof amount === 'string'
                ? parseFloat(amount.replace(/[$,]/g, '')) || 0
                : parseFloat(amount) || 0;
              return (
                <div key={category} className="flex justify-between items-center p-4 border rounded-2xl shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                  <span className="text-sm font-bold capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {category}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    ${numAmount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete your first check-in to generate a personalized budget plan.
          </p>
        )}
      </div>

      {/* Savings Strategy */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Savings Strategy
        </h3>
        {Object.keys(plan.savingsStrategy).length > 0 ? (
          <div className="rounded-2xl p-6 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {Object.entries(plan.savingsStrategy).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center border-b pb-2 last:border-0" style={{ borderColor: 'var(--line-soft)' }}>
                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-bold text-brand">
                    {typeof value === 'number'
                      ? `$${value.toLocaleString()}`
                      : (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[$,]/g, '')))
                        ? `$${parseFloat(value.replace(/[$,]/g, '')).toLocaleString()}`
                        : value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Savings recommendations will appear after your first check-in.
          </p>
        )}
      </div>

      {/* Debt Strategy */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Debt Payoff Strategy
        </h3>
        {Object.keys(plan.debtStrategy).length > 0 ? (
          <div className="rounded-2xl p-6 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {Object.entries(plan.debtStrategy).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center border-b pb-2 last:border-0" style={{ borderColor: 'var(--line-soft)' }}>
                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-bold text-black dark:text-white">
                    {typeof value === 'number'
                      ? `$${value.toLocaleString()}`
                      : (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[$,]/g, '')))
                        ? `$${parseFloat(value.replace(/[$,]/g, '')).toLocaleString()}`
                        : value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Debt payoff recommendations will appear if you have debts.
          </p>
        )}
      </div>

      {/* Goal Timelines */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Goal Timelines
        </h3>
        {plan.goalTimelines.length > 0 ? (
          <div className="space-y-4">
            {plan.goalTimelines.map((goal, idx) => (
              <div key={idx} className="rounded-2xl p-6 border shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {goal.name}
                  </span>
                  {goal.targetDate && (
                    <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full dark:bg-slate-700 dark:text-slate-300">
                      Target: {goal.targetDate}
                    </span>
                  )}
                </div>
                {goal.description && (
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {goal.description}
                  </p>
                )}
                {goal.monthlyContribution && (
                  <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--line-soft)' }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Required Contribution</span>
                    <span className="text-base font-bold text-brand">
                      ${parseFloat(goal.monthlyContribution).toLocaleString()}/mo
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Goal timelines will be generated based on your goals and financial situation.
          </p>
        )}
      </div>

      {/* Action Items */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Critical Action Items
        </h3>
        {plan.actionItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.actionItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-brand transition-all">
                <span className="w-8 h-8 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black font-black rounded-sm text-[10px] flex-shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-tight leading-relaxed text-black dark:text-white">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Action items will appear after your first check-in.
          </p>
        )}
      </div>

      {/* Insights */}
      <div>
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Strategic Insights
        </h3>
        {plan.insights.length > 0 ? (
          <div className="space-y-4">
            {plan.insights.map((insight, idx) => (
              <div key={idx} className="p-6 rounded-2xl border-l-4 shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--color-primary)', borderLeftColor: 'var(--color-primary)' }}>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>{insight}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            AI insights will appear after your first check-in.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialPlan;

