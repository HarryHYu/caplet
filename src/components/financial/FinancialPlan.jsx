const FinancialPlan = ({ plan }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Your Financial Plan
      </h2>

      {/* Budget Allocation */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Budget Allocation
        </h3>
        {Object.keys(plan.budgetAllocation).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(plan.budgetAllocation).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-900 dark:text-white capitalize">{category}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete your first check-in to generate a personalized budget plan.
          </p>
        )}
      </div>

      {/* Savings Strategy */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Savings Strategy
        </h3>
        {Object.keys(plan.savingsStrategy).length > 0 ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            {Object.entries(plan.savingsStrategy).map(([key, value]) => (
              <div key={key} className="mb-2">
                <span className="text-gray-900 dark:text-white capitalize">{key}: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Savings recommendations will appear after your first check-in.
          </p>
        )}
      </div>

      {/* Debt Strategy */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Debt Payoff Strategy
        </h3>
        {Object.keys(plan.debtStrategy).length > 0 ? (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            {Object.entries(plan.debtStrategy).map(([key, value]) => (
              <div key={key} className="mb-2">
                <span className="text-gray-900 dark:text-white capitalize">{key}: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Debt payoff recommendations will appear if you have debts.
          </p>
        )}
      </div>

      {/* Goal Timelines */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Goal Timelines
        </h3>
        {plan.goalTimelines.length > 0 ? (
          <div className="space-y-3">
            {plan.goalTimelines.map((goal, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {goal.name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Target: {goal.targetDate}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {goal.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Goal timelines will be generated based on your goals and financial situation.
          </p>
        )}
      </div>

      {/* Action Items */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Action Items
        </h3>
        {plan.actionItems.length > 0 ? (
          <div className="space-y-2">
            {plan.actionItems.map((item, idx) => (
              <div key={idx} className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-yellow-600 dark:text-yellow-400 mr-2">•</span>
                <span className="text-gray-900 dark:text-white">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Action items will appear after your first check-in.
          </p>
        )}
      </div>

      {/* Insights */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Insights & Recommendations
        </h3>
        {plan.insights.length > 0 ? (
          <div className="space-y-2">
            {plan.insights.map((insight, idx) => (
              <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-gray-900 dark:text-white">{insight}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            AI insights will appear after your first check-in.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialPlan;

