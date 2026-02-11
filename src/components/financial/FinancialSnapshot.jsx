const FinancialSnapshot = ({ data }) => {
  return (
    <div className="rounded-3xl border p-6 md:p-8" style={{ background: 'var(--surface-soft)', borderColor: 'var(--line-soft)' }}>
      <h2 className="text-2xl font-bold mb-6 md:mb-8" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        Asset & Liability Overview
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Net Worth */}
        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Net Worth</p>
          <p className="text-2xl lg:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ${(data.netWorth || 0).toLocaleString()}
          </p>
        </div>

        {/* Monthly Income */}
        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Monthly Income</p>
          <p className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            ${(data.monthlyIncome || 0).toLocaleString()}
          </p>
        </div>

        {/* Monthly Expenses */}
        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Monthly Expenses</p>
          <p className="text-2xl lg:text-3xl font-bold text-rose-600 dark:text-rose-400">
            ${(data.monthlyExpenses || 0).toLocaleString()}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Savings Rate</p>
          <p className="text-2xl lg:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {typeof data.savingsRate === 'number' ? data.savingsRate.toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      {/* Accounts & Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
        {/* Accounts */}
        <div>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Accounts
          </h3>
          {data.accounts && data.accounts.length > 0 ? (
            <div className="space-y-3">
              {data.accounts.map((account, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 border rounded-2xl shadow-sm transition-all hover:translate-x-1" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{account.name}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    ${(account.balance || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
              No accounts added yet. Add accounts in your check-in.
            </p>
          )}
        </div>

        {/* Debts */}
        <div>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Debts
          </h3>
          {data.debts && data.debts.length > 0 ? (
            <div className="space-y-3">
              {data.debts.map((debt, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 border rounded-2xl shadow-sm transition-all hover:translate-x-1" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{debt.name}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    -${(debt.amount || debt.balance || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
              No debts recorded. Add debts in your check-in.
            </p>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Active Financial Goals
        </h3>
        {data.goals && data.goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.goals.map((goal, idx) => (
              <div key={idx} className="rounded-2xl p-5 border shadow-sm" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm lg:text-base" style={{ color: 'var(--text-primary)' }}>
                    {goal.name}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full dark:bg-indigo-900/40 dark:text-indigo-300">
                    ${(goal.currentAmount || goal.current || 0).toLocaleString()} of ${(goal.targetAmount || goal.target || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((goal.currentAmount || goal.current || 0) / (goal.targetAmount || goal.target || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            No goals set yet. Add goals in your check-in.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialSnapshot;

