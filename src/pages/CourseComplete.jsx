import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { nextAction } from '../lib/nextAction';

const inputClass =
  'w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

const profileIsSparse = (p) =>
  !p || (p.annualIncome == null && p.savingsBalance == null && p.superBalance == null);

const CourseComplete = () => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [profile, setProfile] = useState(null);

  // Inline "fill 2-3 fields" form (only shown when the profile is sparse).
  const [quick, setQuick] = useState({ annualIncome: '', savingsBalance: '', superBalance: '' });
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [quickSaved, setQuickSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [courseData, progressData, profileData] = await Promise.all([
        api.getCourse(courseId).catch(() => null),
        api.getCourseProgress(courseId).catch(() => null),
        // Never block the celebration on a financial-profile failure.
        api.getFinancialProfile().then((r) => r.financialProfile).catch(() => null),
      ]);
      if (!active) return;
      setCourse(courseData);
      setProgress(progressData);
      setProfile(profileData);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [courseId]);

  const handleQuickSave = async (e) => {
    e.preventDefault();
    setSavingQuick(true);
    setQuickError(null);
    try {
      const money = (v) => (String(v).trim() === '' ? null : Number(v));
      const { financialProfile: updated } = await api.updateFinancialProfile({
        annualIncome: money(quick.annualIncome),
        savingsBalance: money(quick.savingsBalance),
        superBalance: money(quick.superBalance),
      });
      setProfile(updated); // recomputes the next action below
      setQuickSaved(true);
    } catch (err) {
      setQuickError(err.message || 'Could not save right now. You can add this later in Settings.');
    } finally {
      setSavingQuick(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Wrapping up…" />
      </div>
    );
  }

  // Honest fallback if someone reaches this page before finishing the course.
  const cp = progress?.courseProgress;
  if (cp && cp.status !== 'completed') {
    return (
      <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
        <div className="container-custom max-w-2xl">
          <span className="section-kicker">Almost there</span>
          <h1 className="text-5xl md:text-7xl mb-8">Not quite<br />finished.</h1>
          <p className="text-lg text-text-muted font-serif italic mb-12 leading-relaxed">
            You&apos;ve completed {cp.completedLessons} of {cp.totalLessons} lessons in
            {course?.title ? ` ${course.title}` : ' this course'}. Finish the rest to unlock your next step.
          </p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-4 px-10 text-sm">
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  const action = nextAction(profile || {});
  const sparse = profileIsSparse(profile);

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-3xl">
        {/* Acknowledgement */}
        <header className="mb-16 reveal-text">
          <span className="section-kicker">Course complete</span>
          <h1 className="text-5xl md:text-7xl mb-8">
            {course?.title ? course.title : 'Course'}<br />complete.
          </h1>
          <p className="text-xl text-text-muted font-serif italic max-w-xl leading-relaxed">
            {cp
              ? `You finished all ${cp.totalLessons} lesson${cp.totalLessons === 1 ? '' : 's'}. That's real progress — now let's put it to work.`
              : "That's real progress — now let's put it to work."}
          </p>
        </header>

        {/* Inline profile prompt (only when sparse) */}
        {sparse && !quickSaved && (
          <div className="mb-16 bg-surface-raised border border-line-soft p-10 reveal-text stagger-1">
            <h2 className="text-lg font-bold text-text-primary mb-2">Make the tools yours.</h2>
            <p className="text-sm font-medium text-text-dim mb-8">
              Add a few numbers and we&apos;ll tailor your next step. Private to you, and you can change it anytime.
            </p>
            <form onSubmit={handleQuickSave} className="space-y-8">
              {quickError && (
                <div className="px-6 py-4 border border-red-500 text-red-500 font-medium text-sm">{quickError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label htmlFor="qIncome" className="block text-sm font-semibold text-text-dim">Annual income</label>
                  <input id="qIncome" type="number" min="0" step="1" value={quick.annualIncome}
                    onChange={(e) => setQuick((p) => ({ ...p, annualIncome: e.target.value }))}
                    placeholder="e.g. 80000" className={inputClass} />
                </div>
                <div className="space-y-3">
                  <label htmlFor="qSavings" className="block text-sm font-semibold text-text-dim">Savings</label>
                  <input id="qSavings" type="number" min="0" step="1" value={quick.savingsBalance}
                    onChange={(e) => setQuick((p) => ({ ...p, savingsBalance: e.target.value }))}
                    placeholder="e.g. 5000" className={inputClass} />
                </div>
                <div className="space-y-3">
                  <label htmlFor="qSuper" className="block text-sm font-semibold text-text-dim">Super</label>
                  <input id="qSuper" type="number" min="0" step="1" value={quick.superBalance}
                    onChange={(e) => setQuick((p) => ({ ...p, superBalance: e.target.value }))}
                    placeholder="e.g. 15000" className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={savingQuick} className="btn-primary py-4 px-10 text-sm disabled:opacity-30">
                {savingQuick ? 'Saving...' : 'Save & personalize'}
              </button>
            </form>
          </div>
        )}

        {/* One concrete next action */}
        <div className="bg-surface-raised border border-line-soft p-10 reveal-text stagger-2">
          <p className="text-xs font-semibold text-accent mb-3">Your next step</p>
          <h2 className="text-2xl font-bold text-text-primary mb-3">{action.title}</h2>
          <p className="text-sm font-medium text-text-muted leading-relaxed mb-8 max-w-xl">{action.rationale}</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link to={action.to} className="btn-primary py-4 px-10 text-sm">
              Let&apos;s go
            </Link>
            {!sparse && (
              <Link to="/settings/financial" className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
                Update your financial profile
              </Link>
            )}
          </div>
        </div>

        {/* Secondary nav */}
        <div className="mt-12 flex flex-wrap gap-8 reveal-text stagger-3">
          <Link to={`/courses/${courseId}`} className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
            ← Back to course
          </Link>
          <Link to="/courses" className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
            Browse more courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseComplete;
