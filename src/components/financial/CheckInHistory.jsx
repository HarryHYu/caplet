const CheckInHistory = ({ checkIns }) => {
  return (
    <div className="rounded-3xl border p-6 md:p-8" style={{ background: 'var(--surface-soft)', borderColor: 'var(--line-soft)' }}>
      <h2 className="text-2xl font-bold mb-8 md:mb-10" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        Temporal Record Oversight
      </h2>

      {checkIns.length > 0 ? (
        <div className="space-y-6">
          {checkIns.map((checkIn, idx) => (
            <div key={idx} className="rounded-2xl p-6 border shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {new Date(checkIn.date).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded dark:bg-indigo-900/30 dark:text-indigo-400">
                      {checkIn.majorEvents?.length || 0} Events
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded dark:bg-slate-700 dark:text-slate-300">
                      {checkIn.goalsUpdate?.length || 0} Goal Updates
                    </span>
                  </div>
                </div>
              </div>

              {/* Major Events */}
              {checkIn.majorEvents && checkIn.majorEvents.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Major Events:
                  </h4>
                  <div className="space-y-2">
                    {checkIn.majorEvents.map((event, eIdx) => (
                      <div key={eIdx} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                          <span className="font-bold capitalize">{event.type.replace('_', ' ')}:</span> {event.description}
                          {event.amount && <span className="ml-2 font-bold text-indigo-600 dark:text-indigo-400">($${parseFloat(event.amount).toLocaleString()})</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses Summary */}
              {checkIn.monthlyExpenses && (
                <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                      Aggregate Liquidity Usage:
                    </h4>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      ${Object.values(checkIn.monthlyExpenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {checkIn.notes && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Oversight Notes:
                  </h4>
                  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    "{checkIn.notes}"
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

