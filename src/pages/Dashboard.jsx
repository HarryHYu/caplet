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
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');

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
      const [state, planData, history, summaryData] = await Promise.all([
        api.getFinancialState(),
        api.getFinancialPlan(),
        api.getCheckInHistory(),
        api.getSummary().catch(() => ({ content: '' })) // Don't fail if summary doesn't exist
      ]);

      setFinancialData(state);
      setPlan(planData);
      setCheckIns(history);
      // Set summary from dedicated endpoint
      const summaryValue = summaryData?.content || '';
      setSummary(summaryValue);
      console.log('Summary loaded:', summaryValue ? `${summaryValue.substring(0, 50)}...` : 'empty');
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
      // Close form first
      setShowCheckIn(false);
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error submitting check-in:', error);
      // Re-throw so form can handle it
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8">
      <div className="container-custom px-4 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Financial Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
              Track your finances and get personalized planning
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary text-sm md:text-base px-3 md:px-4 py-2"
            >
              {showHistory ? 'Hide' : 'View'} History
            </button>
            <button
              onClick={() => setShowCheckIn(true)}
              className="btn-primary text-sm md:text-base px-3 md:px-4 py-2"
            >
              New Check-in
            </button>
            <button
              onClick={() => setShowSummary(true)}
              className="px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 text-sm md:text-base"
              title="View AI-maintained financial summary"
            >
              View Summary
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 text-sm md:text-base"
            >
              Delete All Data
            </button>
          </div>
        </div>

        {/* AI Response (if it's a question/answer) */}
        {lastResponse && (
          <div className="mb-6 md:mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg p-4 md:p-6">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                AI Response
              </h2>
              <button
                onClick={() => setLastResponse(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0 ml-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {lastResponse}
            </p>
          </div>
        )}

        {/* Financial Snapshot */}
        <div className="mb-6 md:mb-8">
          <FinancialSnapshot data={financialData} />
        </div>

        {/* Financial Plan */}
        <div className="mb-6 md:mb-8">
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

        {/* Summary Modal */}
        {showSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      Financial Summary
                    </h2>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      AI-maintained summary of all your financial information and check-ins.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
                  {summary && summary.trim() !== '' ? (
                    <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                      {summary}
                    </p>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        No summary available yet.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Submit a check-in to generate an AI-maintained summary of your financial information.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
              <div className="flex flex-col sm:flex-row gap-4">
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

