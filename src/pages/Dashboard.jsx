import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FinancialSnapshot from '../components/financial/FinancialSnapshot';

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Session-only chat messages (not persisted)
  const [messages, setMessages] = useState([]);
  
  // Financial data (loaded from backend)
  const [financialData, setFinancialData] = useState({
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    accounts: [],
    debts: [],
    goals: []
  });
  
  // Optional manual input
  const [manualInput, setManualInput] = useState({
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
  
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [state, planData, summaryData] = await Promise.all([
        api.getFinancialState(),
        api.getFinancialPlan(),
        api.getSummary().catch(() => ({ content: '' }))
      ]);

      // Calculate expenses from budget allocation if monthlyExpenses is 0 but plan has budget
      let finalState = { ...state };
      if (finalState.monthlyExpenses === 0 && planData.budgetAllocation && Object.keys(planData.budgetAllocation).length > 0) {
        const budgetExpenses = { ...planData.budgetAllocation };
        delete budgetExpenses.savings;
        const totalExpenses = Object.values(budgetExpenses).reduce((sum, val) => {
          const numVal = typeof val === 'string' 
            ? parseFloat(val.replace(/[$,]/g, '')) || 0
            : parseFloat(val) || 0;
          return sum + numVal;
        }, 0);
        if (totalExpenses > 0) {
          finalState.monthlyExpenses = totalExpenses;
          if (finalState.monthlyIncome > 0) {
            finalState.savingsRate = ((finalState.monthlyIncome - totalExpenses) / finalState.monthlyIncome) * 100;
          }
        }
      }
      
      setFinancialData(finalState);
      const summaryValue = summaryData?.content || '';
      setSummary(summaryValue);
      
      // Add welcome message only on initial load (when messages are empty)
      if (messages.length === 0) {
        if (summaryValue) {
          setMessages([{
            type: 'ai',
            content: "Hey! I'm your Caplet financial advisor. I remember you - here's what I know about your finances:",
            timestamp: new Date()
          }, {
            type: 'summary',
            content: summaryValue,
            timestamp: new Date()
          }]);
        } else {
          setMessages([{
            type: 'ai',
            content: "Hey! I'm your Caplet financial advisor. What's going on with your finances? Tell me anything - a question, an update, a concern, or just do a quick check-in.",
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    const userMessage = message.trim();
    setMessage('');
    setSubmitting(true);

    // Add user message to chat
    const userMsg = {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Add loading message
    const loadingMsg = {
      type: 'ai',
      content: 'Thinking...',
      timestamp: new Date(),
      loading: true
    };
    setMessages(prev => [...prev, loadingMsg]);
    
    // Scroll to bottom to show loading message
    setTimeout(() => scrollToBottom(), 100);

    try {
      // Prepare check-in data - clean up expenses object
      let monthlyExpenses = null;
      const expensesEntries = Object.entries(manualInput.monthlyExpenses).filter(([_, val]) => val && val.toString().trim() !== '');
      if (expensesEntries.length > 0) {
        monthlyExpenses = {};
        expensesEntries.forEach(([key, val]) => {
          monthlyExpenses[key] = val.toString().trim();
        });
      }

      const checkInData = {
        message: userMessage,
        monthlyIncome: manualInput.monthlyIncome && manualInput.monthlyIncome.toString().trim() !== '' 
          ? parseFloat(manualInput.monthlyIncome) 
          : null,
        monthlyExpenses: monthlyExpenses || {},
        isMonthlyCheckIn: false
      };

      const result = await api.submitCheckIn(checkInData);
      
      // Remove loading message and add AI response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.loading);
        return [...withoutLoading, {
          type: 'ai',
          content: result.response || 'Check-in processed successfully.',
          summary: result.summary || result.response || 'Check-in processed successfully.',
          detailedBreakdown: result.detailedBreakdown || result.response || 'Check-in processed successfully.',
          timestamp: new Date()
        }];
      });

      // Update financial data without reloading messages
      try {
        const [state, planData] = await Promise.all([
          api.getFinancialState(),
          api.getFinancialPlan()
        ]);

        // Calculate expenses from budget allocation if monthlyExpenses is 0 but plan has budget
        let finalState = { ...state };
        if (finalState.monthlyExpenses === 0 && planData.budgetAllocation && Object.keys(planData.budgetAllocation).length > 0) {
          const budgetExpenses = { ...planData.budgetAllocation };
          delete budgetExpenses.savings;
          const totalExpenses = Object.values(budgetExpenses).reduce((sum, val) => {
            const numVal = typeof val === 'string' 
              ? parseFloat(val.replace(/[$,]/g, '')) || 0
              : parseFloat(val) || 0;
            return sum + numVal;
          }, 0);
          if (totalExpenses > 0) {
            finalState.monthlyExpenses = totalExpenses;
            if (finalState.monthlyIncome > 0) {
              finalState.savingsRate = ((finalState.monthlyIncome - totalExpenses) / finalState.monthlyIncome) * 100;
            }
          }
        }
        
        setFinancialData(finalState);
        
        // Update summary without resetting messages
        try {
          const summaryData = await api.getSummary().catch(() => ({ content: '' }));
          setSummary(summaryData?.content || '');
        } catch (e) {
          // Ignore summary update errors
        }
      } catch (error) {
        console.error('Error updating financial data:', error);
        // Don't show error to user, just log it
      }
      
      // Reset manual input
      setManualInput({
        monthlyIncome: '',
        monthlyExpenses: {
          rent: '', food: '', utilities: '', transport: '', entertainment: '', other: ''
        }
      });
      setShowAdvanced(false);
      
      // Focus input again
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error('Error submitting check-in:', error);
      // Remove loading message and add error
      let errorMessage = 'Failed to process your message. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.errors && error.errors.length > 0) {
        errorMessage = error.errors.map(e => e.msg || e.message).join(', ');
      }
      
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.loading);
        return [...withoutLoading, {
          type: 'error',
          content: errorMessage,
          timestamp: new Date()
        }];
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleting(true);
      await api.deleteAllData();
      await loadDashboardData();
      setMessages([{
        type: 'ai',
        content: "All your data has been deleted. How can I help you get started?",
        timestamp: new Date()
      }]);
      setShowDeleteConfirm(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header with Financial Snapshot - Compact */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Financial Dashboard
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Chat with your AI financial advisor
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSummary(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                View Summary
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                Delete All Data
              </button>
            </div>
          </div>
          
          {/* Compact Financial Snapshot */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 md:p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Income</p>
              <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                ${(financialData.monthlyIncome || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 md:p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Expenses</p>
              <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">
                ${(financialData.monthlyExpenses || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 md:p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Savings Rate</p>
              <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                {typeof financialData.savingsRate === 'number' ? financialData.savingsRate.toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 md:p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Worth</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                ${(financialData.netWorth || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface - Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4 md:py-6">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, idx) => {
            const isExpanded = expandedMessages.has(idx);
            const hasBreakdown = msg.detailedBreakdown && msg.detailedBreakdown !== msg.summary;
            const showSummary = msg.summary && hasBreakdown;
            
            return (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-3 ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.type === 'error'
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      : msg.type === 'summary'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  ) : (
                    <div>
                      {/* Show summary by default, or full content if no breakdown */}
                      {showSummary && !isExpanded ? (
                        <div>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.summary}</p>
                          <button
                            onClick={() => setExpandedMessages(prev => new Set([...prev, idx]))}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            Show detailed breakdown →
                          </button>
                        </div>
                      ) : hasBreakdown && isExpanded ? (
                        <div>
                          <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Summary:</p>
                            <p className="text-gray-600 dark:text-gray-400">{msg.summary}</p>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Detailed Breakdown:</p>
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">{msg.detailedBreakdown}</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedMessages);
                              newSet.delete(idx);
                              setExpandedMessages(newSet);
                            }}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            Show less ↑
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex-shrink-0">
          {/* Advanced Options (Collapsible) */}
          {showAdvanced && (
            <div className="mb-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Income (optional)
                  </label>
                  <input
                    type="number"
                    value={manualInput.monthlyIncome}
                    onChange={(e) => setManualInput(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(manualInput.monthlyExpenses).slice(0, 3).map(([category, value]) => (
                    <div key={category}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 capitalize truncate">
                        {category}
                      </label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setManualInput(prev => ({
                          ...prev,
                          monthlyExpenses: { ...prev.monthlyExpenses, [category]: e.target.value }
                        }))}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(manualInput.monthlyExpenses).slice(3).map(([category, value]) => (
                    <div key={category}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 capitalize truncate">
                        {category}
                      </label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setManualInput(prev => ({
                          ...prev,
                          monthlyExpenses: { ...prev.monthlyExpenses, [category]: e.target.value }
                        }))}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question, share an update, or do a check-in..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!message.trim() || submitting}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
              >
                {showAdvanced ? 'Hide' : 'Options'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Financial Summary
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    AI-maintained summary of all your financial information
                  </p>
                </div>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                {summary && summary.trim() ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{summary}</p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No summary available yet. Start chatting to generate one!
                  </p>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete All Data?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              This will permanently delete all your personal data: check-ins, financial plans, summaries, and progress. 
              Courses and lessons will be preserved. Your account will remain, but all other personal data will be lost.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex-1 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
