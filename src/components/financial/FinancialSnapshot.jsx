const FinancialSnapshot = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
        Financial Snapshot
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {/* Net Worth */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">Net Worth</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            ${(data.netWorth || 0).toLocaleString()}
          </p>
        </div>

        {/* Monthly Income */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">Monthly Income</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
            ${(data.monthlyIncome || 0).toLocaleString()}
          </p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">Monthly Expenses</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400">
            ${(data.monthlyExpenses || 0).toLocaleString()}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">Savings Rate</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {typeof data.savingsRate === 'number' ? data.savingsRate.toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      {/* Accounts & Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
        {/* Accounts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Accounts
          </h3>
          {data.accounts.length > 0 ? (
            <div className="space-y-2">
              {data.accounts.map((account, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-900 dark:text-white">{account.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${account.balance.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No accounts added yet. Add accounts in your check-in.
            </p>
          )}
        </div>

        {/* Debts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Debts
          </h3>
          {data.debts.length > 0 ? (
            <div className="space-y-2">
              {data.debts.map((debt, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-900 dark:text-white">{debt.name}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -${(debt.amount || debt.balance || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No debts recorded. Add debts in your check-in.
            </p>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Active Goals
        </h3>
        {data.goals.length > 0 ? (
          <div className="space-y-3">
            {data.goals.map((goal, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {goal.name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                    ${(goal.currentAmount || goal.current || 0).toLocaleString()} / ${(goal.targetAmount || goal.target || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, ((goal.currentAmount || goal.current || 0) / (goal.targetAmount || goal.target || 1)) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No goals set yet. Add goals in your check-in.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialSnapshot;

