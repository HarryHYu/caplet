import { useState } from 'react';
import CheckInForm from '../components/financial/CheckInForm';
import FinancialPlan from '../components/financial/FinancialPlan';
import FinancialSnapshot from '../components/financial/FinancialSnapshot';
import CheckInHistory from '../components/financial/CheckInHistory';

const Dashboard = () => {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Placeholder data - will be replaced with API calls
  const financialData = {
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    accounts: [],
    debts: [],
    goals: []
  };

  const plan = {
    budgetAllocation: {},
    savingsStrategy: {},
    debtStrategy: {},
    goalTimelines: [],
    actionItems: [],
    insights: []
  };

  const checkIns = [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Financial Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your finances and get personalized planning
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary"
            >
              {showHistory ? 'Hide' : 'View'} History
            </button>
            <button
              onClick={() => setShowCheckIn(true)}
              className="btn-primary"
            >
              New Check-in
            </button>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="mb-8">
          <FinancialSnapshot data={financialData} />
        </div>

        {/* Financial Plan */}
        <div className="mb-8">
          <FinancialPlan plan={plan} />
        </div>

        {/* Check-in History (tucked away, toggleable) */}
        {showHistory && (
          <div className="mb-8">
            <CheckInHistory checkIns={checkIns} />
          </div>
        )}

        {/* Check-in Modal */}
        {showCheckIn && (
          <CheckInForm
            onClose={() => setShowCheckIn(false)}
            onSubmit={(data) => {
              // TODO: Handle check-in submission
              console.log('Check-in data:', data);
              setShowCheckIn(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

