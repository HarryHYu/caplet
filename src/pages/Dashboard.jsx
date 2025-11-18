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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

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
      // Store the AI response
      if (result.response) {
        setLastResponse(result.response);
      }
      // Reload dashboard data
      await loadDashboardData();
      setShowCheckIn(false);
    } catch (error) {
      console.error('Error submitting check-in:', error);
      // Show user-friendly error message
      const errorMsg = error.message || 'Failed to submit check-in. Please try again.';
      alert(errorMsg);
      throw error;
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleting(true);
      await api.deleteAllData();
      // Reload dashboard data
      await loadDashboardData();
      setShowDeleteConfirm(false);
      alert('All data deleted successfully');
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Error deleting data. Please try again.');
    } finally {
      setDeleting(false);
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Delete All Data
            </button>
          </div>
        </div>

        {/* AI Response (if it's a question/answer) */}
        {lastResponse && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg p-6">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Response
              </h2>
              <button
                onClick={() => setLastResponse(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {lastResponse}
            </p>
          </div>
        )}

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

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Delete All Data?
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This will permanently delete all your check-ins, financial plans, progress, and course data. 
                Your account will remain, but all other data will be lost. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete All Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

