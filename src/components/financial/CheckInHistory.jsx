const CheckInHistory = ({ checkIns }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
        Check-in History
      </h2>

      {checkIns.length > 0 ? (
        <div className="space-y-4">
          {checkIns.map((checkIn, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {new Date(checkIn.date).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {checkIn.majorEvents?.length || 0} major events, {checkIn.goalsUpdate?.length || 0} goals updated
                  </p>
                </div>
              </div>

              {/* Major Events */}
              {checkIn.majorEvents && checkIn.majorEvents.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Major Events:
                  </h4>
                  <div className="space-y-1">
                    {checkIn.majorEvents.map((event, eIdx) => (
                      <p key={eIdx} className="text-sm text-gray-600 dark:text-gray-400">
                        • {event.type.replace('_', ' ')}: {event.description}
                        {event.amount && ` ($${parseFloat(event.amount).toLocaleString()})`}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses Summary */}
              {checkIn.monthlyExpenses && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Expenses:
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total: ${Object.values(checkIn.monthlyExpenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Notes */}
              {checkIn.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes:
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {checkIn.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No check-ins yet. Complete your first check-in to start tracking your financial journey.
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckInHistory;

