import { useState, useEffect, useRef, useCallback } from 'react';
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

  const loadDashboardData = useCallback(async () => {
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
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        if (summaryValue) {
          return [{
            type: 'ai',
            content: "Hey! I'm your Caplet financial advisor. I remember you - here's what I know about your finances:",
            timestamp: new Date()
          }, {
            type: 'summary',
            content: summaryValue,
            timestamp: new Date()
          }];
        }
        return [{
          type: 'ai',
          content: "Hey! I'm your Caplet financial advisor. What's going on with your finances? Tell me anything - a question, an update, a concern, or just do a quick check-in.",
          timestamp: new Date()
        }];
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, loadDashboardData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const expensesEntries = Object.entries(manualInput.monthlyExpenses).filter(([, val]) => val && val.toString().trim() !== '');
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
      const aiResponse = result.response || 'Check-in processed successfully.';
      let aiSummary = result.summary || null;
      let aiBreakdown = result.detailedBreakdown || null;

      console.log('AI Response:', {
        hasResponse: !!aiResponse,
        hasSummary: !!aiSummary,
        hasBreakdown: !!aiBreakdown,
        responseLength: aiResponse?.length
      });

      // If AI didn't return separate summary/breakdown, create them from the response
      if (!aiSummary && !aiBreakdown) {
        // Auto-split: first 2-3 sentences as summary, rest as breakdown
        if (aiResponse.length > 150) {
          const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
          if (sentences.length >= 3) {
            aiSummary = sentences.slice(0, 2).join('. ').trim() + '.';
            aiBreakdown = aiResponse;
          } else if (sentences.length === 2) {
            aiSummary = sentences[0].trim() + '.';
            aiBreakdown = aiResponse;
          } else {
            // Single sentence - use response for both
            aiSummary = aiResponse;
            aiBreakdown = aiResponse;
          }
        } else {
          // Short response - use for both (no expand)
          aiSummary = aiResponse;
          aiBreakdown = aiResponse;
        }
      } else if (!aiSummary && aiBreakdown) {
        // Has breakdown but no summary - use first part of breakdown as summary
        const sentences = aiBreakdown.split(/[.!?]+/).filter(s => s.trim().length > 0);
        aiSummary = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '');
      } else if (aiSummary && !aiBreakdown) {
        // Has summary but no breakdown - use full response as breakdown
        aiBreakdown = aiResponse;
      }

      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.loading);
        return [...withoutLoading, {
          type: 'ai',
          content: aiResponse,
          summary: aiSummary,
          detailedBreakdown: aiBreakdown,
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
        } catch {
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
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full reveal-up">
          <div className="w-20 h-20 bg-brand/5 border border-brand/10 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-black dark:text-white mb-4 tracking-tight uppercase">
            Restricted Entry
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-10 font-medium">
            Access to the financial terminal requires an active session. Please identify yourself to continue.
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/')}
              className="btn-primary w-full"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="btn-secondary w-full"
            >
              Sign In / Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-1 bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-4 mx-auto">
            <div className="w-full h-full bg-brand animate-progress-indefinite origin-left" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Synchronizing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white dark:bg-black">
      {/* Header with Financial Snapshot - Compact */}
      <div className="border-b border-zinc-100 dark:border-zinc-900 px-4 md:px-6 py-12 md:py-16 bg-white dark:bg-black">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16 reveal-up">
            <div className="max-w-xl">
              <span className="section-kicker">Terminal Dashboard</span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white mb-4">
                Financial Protocol.
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                Intelligent financial advisory powered by Caplet AI. Monitor your sequence and optimize your logic.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowSummary(true)}
                className="btn-primary"
              >
                View Summary
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary"
              >
                Reset Sequence
              </button>
            </div>
          </div>

          {/* Compact Financial Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-up" style={{ animationDelay: '100ms' }}>
            <div className="mesh-card group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Monthly Income</p>
              <p className="text-3xl font-extrabold text-black dark:text-white tracking-tighter group-hover:text-brand transition-colors">
                ${(financialData.monthlyIncome || 0).toLocaleString()}
              </p>
              <div className="mt-4 w-full h-1 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                <div className="h-full bg-brand w-[70%] transition-all duration-1000" />
              </div>
            </div>
            <div className="mesh-card group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Monthly Expenses</p>
              <p className="text-3xl font-extrabold text-black dark:text-white tracking-tighter group-hover:text-rose-500 transition-colors">
                ${(financialData.monthlyExpenses || 0).toLocaleString()}
              </p>
              <div className="mt-4 w-full h-1 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                <div className="h-full bg-black dark:bg-zinc-700 w-[45%] transition-all duration-1000" />
              </div>
            </div>
            <div className="mesh-card group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Savings Rate</p>
              <p className="text-3xl font-extrabold text-black dark:text-white tracking-tighter group-hover:text-brand transition-colors">
                {typeof financialData.savingsRate === 'number' ? financialData.savingsRate.toFixed(1) : '0.0'}%
              </p>
              <div className="mt-4 w-full h-1 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                <div className="h-full bg-brand w-[25%] transition-all duration-1000" />
              </div>
            </div>
            <div className="mesh-card group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Net Worth</p>
              <p className="text-3xl font-extrabold text-black dark:text-white tracking-tighter group-hover:text-brand transition-colors">
                ${(financialData.netWorth || 0).toLocaleString()}
              </p>
              <div className="mt-4 w-full h-1 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                <div className="h-full bg-zinc-800 dark:bg-zinc-200 w-[60%] transition-all duration-1000" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface - Main Content */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-6 py-12">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-8 space-y-6 pr-2">
          {messages.map((msg, idx) => {
            const isExpanded = expandedMessages.has(idx);
            const hasSummary = msg.summary && msg.summary.trim().length > 0;
            const hasBreakdown = msg.detailedBreakdown && msg.detailedBreakdown.trim().length > 0;
            const hasSeparateParts = hasSummary && hasBreakdown && msg.summary !== msg.detailedBreakdown;
            const isAIMessage = msg.type === 'ai' && !msg.loading && msg.type !== 'summary' && msg.content;
            const shouldShowExpand = isAIMessage && hasSeparateParts;

            return (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} reveal-up`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-6 py-5 shadow-sm transition-all ${msg.type === 'user'
                    ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                    : msg.type === 'error'
                      ? 'bg-zinc-50 text-black border border-zinc-200 dark:bg-zinc-900/40 dark:text-white dark:border-zinc-800'
                      : msg.type === 'summary'
                        ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest border border-zinc-100 dark:border-zinc-800'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white border border-zinc-100 dark:border-zinc-800'
                    }`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shouldShowExpand && !isExpanded ? (
                        <div>
                          <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.summary || msg.content}</p>
                          <button
                            onClick={() => setExpandedMessages(prev => new Set([...prev, idx]))}
                            className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand hover:underline flex items-center gap-2"
                          >
                            <span>View Logic Breakdown</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      ) : shouldShowExpand && isExpanded ? (
                        <div className="space-y-6">
                          {msg.summary && msg.summary !== msg.detailedBreakdown && (
                            <div className="p-4 bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Synthesis</p>
                              <p className="text-sm italic leading-relaxed">{msg.summary}</p>
                            </div>
                          )}
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Core Analysis</p>
                            <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.detailedBreakdown || msg.content}</p>
                          </div>
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedMessages);
                              newSet.delete(idx);
                              setExpandedMessages(newSet);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-2"
                          >
                            <span>Collapse Logic</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
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
        <form onSubmit={handleSubmit} className="flex-shrink-0 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {/* Advanced Options (Collapsible) */}
          {showAdvanced && (
            <div className="mb-8 p-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 animate-fade-in">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-8">Override Parameters</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Gross Monthly Yield
                  </label>
                  <input
                    type="number"
                    value={manualInput.monthlyIncome}
                    onChange={(e) => setManualInput(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                    className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(manualInput.monthlyExpenses).map(([category, value]) => (
                    <div key={category} className="space-y-2">
                      <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-400 capitalize">
                        {category}
                      </label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setManualInput(prev => ({
                          ...prev,
                          monthlyExpenses: { ...prev.monthlyExpenses, [category]: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-[10px] uppercase tracking-widest focus:border-brand outline-none"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question or share a financial update..."
                className="input-editorial min-h-[120px] resize-none pr-12 pt-4"
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="absolute top-4 right-4 text-[10px] font-bold text-zinc-300 uppercase tracking-widest pointer-events-none">
                Terminal v1.0
              </div>
            </div>
            <div className="flex flex-col gap-3 h-full justify-end pb-1">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="p-3 text-zinc-400 hover:text-black dark:hover:text-white transition-colors border border-zinc-100 dark:border-zinc-800"
                title="Advanced Options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!message.trim() || submitting}
                className="btn-primary flex items-center justify-center min-w-[120px]"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Transmit'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-12 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Intelligence Summary.
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand mt-2">
                  System Processed Evolution
                </p>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="p-3 text-zinc-400 hover:text-black dark:hover:text-white transition-colors border border-zinc-100 dark:border-zinc-900 rounded-sm"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-12 overflow-y-auto bg-zinc-50 dark:bg-black/50">
              {summary && summary.trim() ? (
                <p className="text-sm font-medium leading-[2] text-zinc-700 dark:text-zinc-300">{summary}</p>
              ) : (
                <div className="text-center py-24 grayscale opacity-40">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Zero Knowledge in Buffer</p>
                  <p className="text-xs mt-4">Initiate transmission to populate identity profile.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-red-600/20 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-950 border border-red-500/50 max-w-md w-full p-12 shadow-2xl">
            <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-6">
              Critical Purge.
            </h2>
            <p className="mb-12 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-[0.2em]">
              This operation permanently deletes check-ins, plans, and parameters. Educational progress is preserved.
            </p>
            <div className="flex gap-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-5 border border-zinc-200 dark:border-zinc-900 font-bold text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900"
                disabled={deleting}
              >
                Abort
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 px-6 py-5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-[0.3em] transition-all"
                disabled={deleting}
              >
                {deleting ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
