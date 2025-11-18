const FinancialPlan = ({ plan }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
        Your Financial Plan
      </h2>

      {/* Budget Allocation */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Budget Allocation
        </h3>
        {Object.keys(plan.budgetAllocation).length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {Object.entries(plan.budgetAllocation).map(([category, amount]) => {
              const numAmount = typeof amount === 'string' 
                ? parseFloat(amount.replace(/[$,]/g, '')) || 0
                : parseFloat(amount) || 0;
              return (
                <div key={category} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm md:text-base text-gray-900 dark:text-white capitalize font-medium">
                    {category}
                  </span>
                  <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
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
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Savings Strategy
        </h3>
        {Object.keys(plan.savingsStrategy).length > 0 ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
            {Object.entries(plan.savingsStrategy).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-sm md:text-base text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                  {typeof value === 'number' 
                    ? `$${value.toLocaleString()}` 
                    : (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[$,]/g, '')))
                      ? `$${parseFloat(value.replace(/[$,]/g, '')).toLocaleString()}`
                      : value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Savings recommendations will appear after your first check-in.
          </p>
        )}
      </div>

      {/* Debt Strategy */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Debt Payoff Strategy
        </h3>
        {Object.keys(plan.debtStrategy).length > 0 ? (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
            {Object.entries(plan.debtStrategy).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-sm md:text-base text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                  {typeof value === 'number' 
                    ? `$${value.toLocaleString()}` 
                    : (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[$,]/g, '')))
                      ? `$${parseFloat(value.replace(/[$,]/g, '')).toLocaleString()}`
                      : value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Debt payoff recommendations will appear if you have debts.
          </p>
        )}
      </div>

      {/* Goal Timelines */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Goal Timelines
        </h3>
        {plan.goalTimelines.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {plan.goalTimelines.map((goal, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <span className="font-semibold text-base md:text-lg text-gray-900 dark:text-white">
                    {goal.name}
                  </span>
                  {goal.targetDate && (
                    <span className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                      Target: {goal.targetDate}
                    </span>
                  )}
                </div>
                {goal.description && (
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                    {goal.description}
                  </p>
                )}
                {goal.monthlyContribution && (
                  <p className="text-sm md:text-base text-blue-600 dark:text-blue-400 font-medium mt-2">
                    Monthly contribution: ${parseFloat(goal.monthlyContribution).toLocaleString()}
                  </p>
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
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Action Items
        </h3>
        {plan.actionItems.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {plan.actionItems.map((item, idx) => (
              <div key={idx} className="flex items-start p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-yellow-600 dark:text-yellow-400 mr-2 md:mr-3 text-lg md:text-xl flex-shrink-0">•</span>
                <span className="text-sm md:text-base text-gray-900 dark:text-white">{item}</span>
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
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
          Insights & Recommendations
        </h3>
        {plan.insights.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {plan.insights.map((insight, idx) => (
              <div key={idx} className="p-3 md:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm md:text-base text-gray-900 dark:text-white leading-relaxed">{insight}</p>
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

