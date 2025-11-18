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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <div className="flex-1 pr-2">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Financial Check-in
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1">
                Tell me what's happening with your finances, ask questions, or do a monthly review
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Main Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What's happening? Ask a question or share an update
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Examples:&#10;&#10;• 'I have a shopping addiction, how much can I afford to spend tomorrow at the mall with friends?'&#10;&#10;• 'Just got a raise to $120k, need help managing my new income'&#10;&#10;• 'Monthly check-in: spent $2500 on rent, $800 on food, $200 on utilities this month'&#10;&#10;• 'Can I afford a $500k house with my current salary?'"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="8"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Be as specific or casual as you want. I'll understand and help you out.
              </p>
            </div>

            {/* Advanced Options (Collapsible) */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <svg 
                  className={`w-4 h-4 mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showAdvanced ? 'Hide' : 'Show'} Optional Details
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monthly Income (optional)
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        monthlyIncome: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., 5000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monthly Expenses Breakdown (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(formData.monthlyExpenses).map(([category, value]) => (
                        <div key={category}>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 capitalize">
                            {category}
                          </label>
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full sm:w-auto"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={loading || !message.trim()}
              >
                {loading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
