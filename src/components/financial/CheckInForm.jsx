import { useState } from 'react';

const CheckInForm = ({ onClose, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    monthlyExpenses: {
      rent: '',
      food: '',
      utilities: '',
      transport: '',
      entertainment: '',
      other: ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Please enter a message or question');
      return;
    }

    setLoading(true);
    try {
      // Prepare check-in data
      const checkInData = {
        message: message.trim(),
        monthlyIncome: formData.monthlyIncome && formData.monthlyIncome.trim() !== ''
          ? parseFloat(formData.monthlyIncome)
          : null,
        monthlyExpenses: formData.monthlyExpenses,
        isMonthlyCheckIn: false // Will be determined by AI or user intent
      };

      await onSubmit(checkInData);
      // If successful, form will be closed by parent
    } catch (error) {
      console.error('Error submitting check-in:', error);
      alert(error.message || 'Failed to submit check-in. Please try again.');
      setLoading(false); // Reset loading state on error
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Financial Intelligence Sync
              </h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Share updates, ask questions, or provide a monthly review for analysis
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Main Message Input */}
            <div className="mb-8">
              <label className="block text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Your Briefing
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Example: 'Just got a raise to $120k. How should I adjust my monthly savings strategy?'"
                className="w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)', color: 'var(--text-primary)' }}
                rows="6"
                required
              />
              <p className="text-xs mt-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                AI will extract financial metadata directly from your message.
              </p>
            </div>

            {/* Advanced Options (Collapsible) */}
            <div className="mb-10">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors group"
              >
                <svg
                  className={`w-4 h-4 mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showAdvanced ? 'Hide' : 'Add'} Structured Metadata
              </button>

              {showAdvanced && (
                <div className="mt-6 p-6 rounded-3xl border space-y-6 shadow-inner" style={{ background: 'var(--surface-body)', borderColor: 'var(--line-soft)' }}>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Monthly Gross Income
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={formData.monthlyIncome}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          monthlyIncome: e.target.value
                        }))}
                        className="w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        style={{ background: 'var(--surface-soft)', borderColor: 'var(--line-soft)', color: 'var(--text-primary)' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Expense Breakdown
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(formData.monthlyExpenses).map(([category, value]) => (
                        <div key={category}>
                          <label className="block text-[10px] font-bold uppercase tracking-tighter mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {category}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                monthlyExpenses: {
                                  ...prev.monthlyExpenses,
                                  [category]: e.target.value
                                }
                              }))}
                              className="w-full pl-6 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                              style={{ background: 'var(--surface-soft)', borderColor: 'var(--line-soft)', color: 'var(--text-primary)' }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-2xl border font-bold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
                style={{ borderColor: 'var(--line-soft)', color: 'var(--text-primary)' }}
                disabled={loading}
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex items-center justify-center min-w-[140px]"
                disabled={loading || !message.trim()}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Run Analysis'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
