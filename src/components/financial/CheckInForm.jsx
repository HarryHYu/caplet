import { useState } from 'react';

const CheckInForm = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Major Events
    majorEvents: [],
    newEvent: { type: '', description: '', amount: '', date: '' },
    
    // Monthly Expenses
    monthlyExpenses: {
      rent: '',
      food: '',
      utilities: '',
      transport: '',
      entertainment: '',
      other: ''
    },
    monthlyIncome: '',
    
    // Goals Update
    goalsUpdate: [],
    newGoal: { name: '', target: '', deadline: '', current: '' },
    
    // Notes
    notes: ''
  });

  const handleAddEvent = () => {
    if (formData.newEvent.type && formData.newEvent.description) {
      setFormData(prev => ({
        ...prev,
        majorEvents: [...prev.majorEvents, { ...prev.newEvent }],
        newEvent: { type: '', description: '', amount: '', date: '' }
      }));
    }
  };

  const handleAddGoal = () => {
    if (formData.newGoal.name && formData.newGoal.target) {
      setFormData(prev => ({
        ...prev,
        goalsUpdate: [...prev.goalsUpdate, { ...prev.newGoal }],
        newGoal: { name: '', target: '', deadline: '', current: '' }
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Monthly Check-in
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Major Events</span>
              <span>Expenses</span>
              <span>Goals</span>
              <span>Review</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Major Financial Events */}
            {step === 1 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Major Financial Events
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Tell us about any significant financial changes (salary changes, large purchases, new debts, etc.)
                </p>

                {/* Add New Event */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Type
                      </label>
                      <select
                        value={formData.newEvent.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newEvent: { ...prev.newEvent, type: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select type</option>
                        <option value="salary_change">Salary Change</option>
                        <option value="large_purchase">Large Purchase</option>
                        <option value="new_debt">New Debt</option>
                        <option value="debt_paid">Debt Paid Off</option>
                        <option value="windfall">Windfall/Bonus</option>
                        <option value="account_change">Account Change</option>
                        <option value="life_change">Life Change</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (if applicable)
                      </label>
                      <input
                        type="number"
                        value={formData.newEvent.amount}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newEvent: { ...prev.newEvent, amount: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.newEvent.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        newEvent: { ...prev.newEvent, description: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder="Describe the event..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    className="btn-secondary"
                  >
                    Add Event
                  </button>
                </div>

                {/* Listed Events */}
                {formData.majorEvents.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.majorEvents.map((event, idx) => (
                      <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          {event.amount && (
                            <span className="ml-2 text-gray-600 dark:text-gray-300">
                              ${parseFloat(event.amount).toLocaleString()}
                            </span>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {event.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            majorEvents: prev.majorEvents.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-600 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-primary"
                  >
                    Next: Monthly Expenses
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Monthly Expenses */}
            {step === 2 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Income & Monthly Expenses
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Enter your monthly income and how much you spent this month in each category.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monthly Take-home Income
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        monthlyIncome: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g. 8000"
                    />
                  </div>

                  {Object.entries(formData.monthlyExpenses).map(([category, value]) => (
                    <div key={category}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-primary"
                  >
                    Next: Goals Update
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Goals Update */}
            {step === 3 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Goals Update
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Update existing goals or add new ones
                </p>

                {/* Add New Goal */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Goal Name
                      </label>
                      <input
                        type="text"
                        value={formData.newGoal.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newGoal: { ...prev.newGoal, name: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="e.g., Emergency Fund"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Amount
                      </label>
                      <input
                        type="number"
                        value={formData.newGoal.target}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newGoal: { ...prev.newGoal, target: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Amount
                      </label>
                      <input
                        type="number"
                        value={formData.newGoal.current}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newGoal: { ...prev.newGoal, current: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={formData.newGoal.deadline}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newGoal: { ...prev.newGoal, deadline: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="btn-secondary"
                  >
                    Add Goal
                  </button>
                </div>

                {/* Listed Goals */}
                {formData.goalsUpdate.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.goalsUpdate.map((goal, idx) => (
                      <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {goal.name}
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            ${parseFloat(goal.current || 0).toLocaleString()} / ${parseFloat(goal.target || 0).toLocaleString()}
                            {goal.deadline && ` - Due: ${goal.deadline}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            goalsUpdate: prev.goalsUpdate.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-600 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="btn-primary"
                  >
                    Next: Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Review Your Check-in
                </h3>

                <div className="space-y-4 mb-6">
                  {/* Major Events Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Major Events ({formData.majorEvents.length})
                    </h4>
                    {formData.majorEvents.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        {formData.majorEvents.map((event, idx) => (
                          <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                            • {event.type.replace('_', ' ')}: {event.description}
                            {event.amount && ` ($${parseFloat(event.amount).toLocaleString()})`}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">None</p>
                    )}
                  </div>

                  {/* Expenses Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Monthly Expenses
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      {formData.monthlyIncome && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Monthly Income: ${parseFloat(formData.monthlyIncome).toLocaleString()}
                        </p>
                      )}
                      {Object.entries(formData.monthlyExpenses).map(([category, amount]) => (
                        amount && (
                          <p key={category} className="text-sm text-gray-600 dark:text-gray-300">
                            {category}: ${parseFloat(amount).toLocaleString()}
                          </p>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Goals Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Goals ({formData.goalsUpdate.length})
                    </h4>
                    {formData.goalsUpdate.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        {formData.goalsUpdate.map((goal, idx) => (
                          <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                            • {goal.name}: ${parseFloat(goal.current || 0).toLocaleString()} / ${parseFloat(goal.target || 0).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">None</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="4"
                      placeholder="Any other financial information you'd like to share..."
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Submit Check-in
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;

