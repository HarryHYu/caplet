import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, CardContent, PageHeader, PageShell } from '../components/ui';
import OnboardingStep from '../components/onboarding/OnboardingStep';
import OptionCard from '../components/onboarding/OptionCard';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getRecommendedActions, goalOptions, incomeRanges, knowledgeLevels } from '../lib/recommendations';

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    knowledgeLevel: user?.onboardingData?.knowledgeLevel || '',
    goals: user?.onboardingData?.goals || [],
    incomeRange: user?.onboardingData?.incomeRange || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recommendations = useMemo(() => getRecommendedActions(formData), [formData]);

  const canContinue = step === 1
    ? Boolean(formData.knowledgeLevel)
    : step === 2
      ? formData.goals.length > 0
      : Boolean(formData.incomeRange);

  const updateField = (field, value) => {
    setError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGoal = (value) => {
    setError('');
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(value)
        ? prev.goals.filter((goal) => goal !== value)
        : [...prev.goals, value],
    }));
  };

  const handleNext = () => {
    if (!canContinue) {
      setError('Choose an option to continue.');
      return;
    }
    setStep((currentStep) => Math.min(TOTAL_STEPS, currentStep + 1));
  };

  const handleBack = () => {
    setError('');
    setStep((currentStep) => Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    if (!canContinue) {
      setError('Choose an income range to finish onboarding.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (completeOnboarding) {
        await completeOnboarding(formData);
      } else {
        await api.completeOnboarding(formData);
      }
      navigate('/dashboard', { replace: true, state: { onboarded: true } });
    } catch (err) {
      setError(err.message || 'Could not save onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell spacing="md" className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <PageHeader
        align="center"
        eyebrow="Personalise Caplet"
        title="Build a money path that fits you."
      >
        Answer three quick prompts so Caplet can recommend a starting point. Onboarding is optional while the backend default keeps existing users active.
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_22rem]">
        <Card className="relative overflow-hidden" padding="lg">
          <div className="mb-10 h-2 overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          {step === 1 && (
            <OnboardingStep
              step={step}
              totalSteps={TOTAL_STEPS}
              title="How confident do you feel with money topics?"
              description="This helps us tune the pace: plain-language foundations, practical refreshers, or deeper strategy."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {knowledgeLevels.map((level) => (
                  <OptionCard
                    key={level.value}
                    name="knowledgeLevel"
                    {...level}
                    selected={formData.knowledgeLevel === level.value}
                    onChange={() => updateField('knowledgeLevel', level.value)}
                  />
                ))}
              </div>
            </OnboardingStep>
          )}

          {step === 2 && (
            <OnboardingStep
              step={step}
              totalSteps={TOTAL_STEPS}
              title="What do you want to work on first?"
              description="Choose one or more goals. We’ll use these to suggest lessons and tools that match your priorities."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goalOptions.map((goal) => (
                  <OptionCard
                    key={goal.value}
                    name="goals"
                    type="checkbox"
                    {...goal}
                    selected={formData.goals.includes(goal.value)}
                    onChange={() => toggleGoal(goal.value)}
                  />
                ))}
              </div>
            </OnboardingStep>
          )}

          {step === 3 && (
            <OnboardingStep
              step={step}
              totalSteps={TOTAL_STEPS}
              title="Which monthly income range should we plan around?"
              description="A range is enough. It helps recommendations stay practical without asking for exact numbers."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {incomeRanges.map((range) => (
                  <OptionCard
                    key={range.value}
                    name="incomeRange"
                    {...range}
                    selected={formData.incomeRange === range.value}
                    onChange={() => updateField('incomeRange', range.value)}
                  />
                ))}
              </div>
            </OnboardingStep>
          )}

          {error && (
            <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={step === 1 ? () => navigate('/dashboard') : handleBack}>
              <ArrowLeftIcon className="h-4 w-4" />
              {step === 1 ? 'Back to dashboard' : 'Back'}
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={!canContinue}>
                Continue
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || !canContinue}>
                {submitting ? 'Saving…' : 'Finish onboarding'}
                <SparklesIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        <Card variant="inverse" padding="lg" className="h-fit overflow-hidden">
          <Badge variant="inverse">Live preview</Badge>
          <CardContent className="mt-6 text-text-contrast">
            <h3 className="text-2xl font-serif italic">Your suggested path</h3>
            <div className="mt-6 space-y-4">
              {recommendations.length > 0 ? recommendations.map((recommendation) => (
                <div key={recommendation} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-text-dim">
                  {recommendation}
                </div>
              )) : (
                <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-text-dim">
                  Pick an option to see how Caplet will shape your first recommendations.
                </p>
              )}
            </div>
            <Link to="/courses" className="mt-8 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-accent hover:underline">
              Browse all courses
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
