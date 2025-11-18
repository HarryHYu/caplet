import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CheckInForm from '../components/financial/CheckInForm';
import FinancialPlan from '../components/financial/FinancialPlan';
import FinancialSnapshot from '../components/financial/FinancialSnapshot';
import CheckInHistory from '../components/financial/CheckInHistory';

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    accounts: [],
    debts: [],
    goals: []
  });
  const [plan, setPlan] = useState({
    budgetAllocation: {},
    savingsStrategy: {},
    debtStrategy: {},
    goalTimelines: [],
    actionItems: [],
    insights: []
  });
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Don't redirect immediately, let user see they need to login
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isAuthenticated, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [state, planData, history] = await Promise.all([
        api.getFinancialState(),
        api.getFinancialPlan(),
        api.getCheckInHistory()
      ]);

      setFinancialData(state);
      setPlan(planData);
      setCheckIns(history);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async (checkInData) => {
    try {
      const result = await api.submitCheckIn(checkInData);
      // Reload dashboard data
      await loadDashboardData();
      setShowCheckIn(false);
      // Optionally show success message
    } catch (error) {
      console.error('Error submitting check-in:', error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign In Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to access your financial dashboard.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
            onSubmit={handleCheckInSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

