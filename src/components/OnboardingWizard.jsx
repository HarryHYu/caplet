import { useState } from 'react';
import { ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const STEPS = [
  { id: 1, title: 'Welcome' },
  { id: 2, title: 'Your Knowledge' },
  { id: 3, title: 'Learning Goals' },
  { id: 4, title: 'Income Range' },
  { id: 5, title: 'Summary' }
];

const KNOWLEDGE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Just starting to learn about personal finance' },
  { id: 'intermediate', label: 'Intermediate', description: 'I have some financial knowledge' },
  { id: 'advanced', label: 'Advanced', description: 'I have strong financial knowledge' }
];

const LEARNING_GOALS = [
  { id: 'budgeting', label: 'Budgeting' },
  { id: 'saving', label: 'Saving' },
  { id: 'investing', label: 'Investing' },
  { id: 'superannuation', label: 'Superannuation' },
  { id: 'tax', label: 'Tax' },
  { id: 'debt', label: 'Paying off debt' },
  { id: 'home', label: 'Buying a home' },
  { id: 'emergency-fund', label: 'Building an emergency fund' }
];

const INCOME_RANGES = [
  { id: 'under-2k', label: 'Under $2,000/month' },
  { id: '2k-4k', label: '$2,000 – $4,000/month' },
  { id: '4k-7k', label: '$4,000 – $7,000/month' },
  { id: '7k-10k', label: '$7,000 – $10,000/month' },
  { id: 'over-10k', label: 'Over $10,000/month' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' }
];

export default function OnboardingWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [knowledgeLevel, setKnowledgeLevel] = useState('');
  const [goals, setGoals] = useState([]);
  const [incomeRange, setIncomeRange] = useState('');

  const handleGoalToggle = (goalId) => {
    setGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : prev.length < 3
          ? [...prev, goalId]
          : prev
    );
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.completeOnboarding({
        knowledgeLevel,
        goals,
        incomeRange
      });

      // Create intro message based on selections
      const goalLabels = goals
        .map(g => LEARNING_GOALS.find(lg => lg.id === g)?.label)
        .filter(Boolean)
        .join(', ');

      const knowledgeLabel = KNOWLEDGE_LEVELS.find(kl => kl.id === knowledgeLevel)?.label;
      const incomeLabel = INCOME_RANGES.find(ir => ir.id === incomeRange)?.label;

      const introMessage = `Hi! I'm a ${knowledgeLabel} looking to learn about ${goalLabels || 'personal finance'}. My monthly income is around ${incomeLabel}.`;

      onComplete(introMessage);
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome step always allows proceeding
      case 2:
        return !!knowledgeLevel;
      case 3:
        return goals.length > 0;
      case 4:
        return !!incomeRange;
      case 5:
        return true; // Summary step
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface-body border border-line-soft rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-body border-b border-line-soft p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-serif italic">Welcome to Caplet</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
              Step {currentStep} of {STEPS.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-soft h-1 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg text-text-primary leading-relaxed mb-4">
                  This tool helps you <span className="font-semibold">learn about personal finance</span> through conversation and interactive exercises.
                </p>
                <p className="text-base text-text-muted leading-relaxed mb-4 p-4 bg-surface-soft border border-line-soft rounded">
                  Important: Caplet provides <span className="font-semibold">financial education only</span> — not financial advice. Always consult a licensed financial advisor for decisions about your money.
                </p>
                <p className="text-base text-text-primary leading-relaxed">
                  Over the next few questions, we'll personalise your learning journey based on your knowledge level, financial goals, and income. Let's get started!
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Knowledge Level */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif italic">How would you describe your financial knowledge?</h2>
              <div className="space-y-3">
                {KNOWLEDGE_LEVELS.map(level => (
                  <label
                    key={level.id}
                    className={`flex items-start p-4 border rounded cursor-pointer transition-all ${
                      knowledgeLevel === level.id
                        ? 'border-accent bg-accent/5'
                        : 'border-line-soft bg-surface-body hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="knowledge-level"
                      value={level.id}
                      checked={knowledgeLevel === level.id}
                      onChange={(e) => setKnowledgeLevel(e.target.value)}
                      className="mt-1 mr-4"
                    />
                    <div>
                      <p className="font-semibold text-text-primary">{level.label}</p>
                      <p className="text-sm text-text-muted">{level.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Learning Goals */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif italic mb-2">What are your main financial learning goals?</h2>
                <p className="text-sm text-text-muted">Select up to 3</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEARNING_GOALS.map(goal => (
                  <label
                    key={goal.id}
                    className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
                      goals.includes(goal.id)
                        ? 'border-accent bg-accent/5'
                        : 'border-line-soft bg-surface-body hover:border-accent/50'
                    } ${goals.length >= 3 && !goals.includes(goal.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={goals.includes(goal.id)}
                      onChange={() => handleGoalToggle(goal.id)}
                      disabled={goals.length >= 3 && !goals.includes(goal.id)}
                      className="mr-3"
                    />
                    <span className="text-text-primary">{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Income Range */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif italic">What's your approximate monthly income range?</h2>
              <div className="space-y-3">
                {INCOME_RANGES.map(range => (
                  <label
                    key={range.id}
                    className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
                      incomeRange === range.id
                        ? 'border-accent bg-accent/5'
                        : 'border-line-soft bg-surface-body hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="income-range"
                      value={range.id}
                      checked={incomeRange === range.id}
                      onChange={(e) => setIncomeRange(e.target.value)}
                      className="mr-4"
                    />
                    <span className="text-text-primary font-medium">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif italic mb-6">You're all set!</h2>

              <div className="space-y-4">
                <div className="p-4 bg-surface-soft border border-line-soft rounded">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Financial Knowledge Level</p>
                  <p className="text-base text-text-primary">
                    {KNOWLEDGE_LEVELS.find(kl => kl.id === knowledgeLevel)?.label}
                  </p>
                </div>

                <div className="p-4 bg-surface-soft border border-line-soft rounded">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Learning Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {goals.map(goalId => {
                      const goal = LEARNING_GOALS.find(g => g.id === goalId);
                      return (
                        <span
                          key={goalId}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded text-sm text-accent"
                        >
                          <CheckIcon className="w-4 h-4" />
                          {goal?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-surface-soft border border-line-soft rounded">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Monthly Income Range</p>
                  <p className="text-base text-text-primary">
                    {INCOME_RANGES.find(ir => ir.id === incomeRange)?.label}
                  </p>
                </div>
              </div>

              <p className="text-sm text-text-muted italic">
                We'll use this information to suggest educational content tailored to your learning journey.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-body border-t border-line-soft p-8 flex gap-4 justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className={`px-6 py-2 border rounded font-medium text-[10px] uppercase tracking-widest transition-all ${
              currentStep === 1
                ? 'border-line-soft text-text-dim opacity-50 cursor-not-allowed'
                : 'border-line-soft text-text-primary hover:bg-surface-soft'
            }`}
          >
            Back
          </button>

          {currentStep === STEPS.length ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-2 bg-accent text-white font-medium text-[10px] uppercase tracking-widest rounded transition-all ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/90'
              }`}
            >
              {loading ? 'Starting...' : 'Start Learning'}
              {!loading && <ChevronRightIcon className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={`flex items-center gap-2 px-8 py-2 font-medium text-[10px] uppercase tracking-widest rounded transition-all ${
                !canProceed()
                  ? 'border border-line-soft text-text-dim opacity-50 cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
