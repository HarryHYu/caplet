import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { nextAction } from '../lib/nextAction';
import { useReveal } from '../lib/useReveal';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

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

  useReveal();

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
        <div className="container-custom max-w-2xl reveal">
          <span className="font-hand text-2xl text-accent -rotate-2 inline-block mb-3">almost there</span>
          <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-8">Not quite<br />finished.</h1>
          <p className="text-lg text-text-muted mb-12 leading-relaxed">
            You&apos;ve completed {cp.completedLessons} of {cp.totalLessons} lessons in
            {course?.title ? ` ${course.title}` : ' this course'}. Finish the rest to unlock your next step.
          </p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-4 px-10 text-sm hover:-translate-y-0.5 transition-transform">
            Back to Course
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
        <header className="mb-16 reveal">
          <p className="font-hand text-2xl text-accent -rotate-2 inline-block mb-3">nice work</p>
          <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mb-8">
            {course?.title ? course.title : 'Course'}<br />complete.
          </h1>
          <p className="text-xl text-text-muted max-w-xl leading-relaxed">
            {cp
              ? `You finished all ${cp.totalLessons} lesson${cp.totalLessons === 1 ? '' : 's'}. That's real progress, now let's put it to work.`
              : "That's real progress, now let's put it to work."}
          </p>
        </header>

        {/* Inline profile prompt (only when sparse) */}
        {sparse && !quickSaved && (
          <div className="mb-16 block-cream rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
            <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-2">Make the Tools Yours</h2>
            <p className="text-sm font-medium text-text-dim mb-8">
              Add a few numbers and we&apos;ll tailor your next step. Private to you, and you can change it anytime.
            </p>
            <form onSubmit={handleQuickSave} className="space-y-8">
              {quickError && (
                <div className="px-6 py-4 rounded-xl bg-red-500/10 text-red-500 font-medium text-sm">{quickError}</div>
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
              <button type="submit" disabled={savingQuick} className="btn-primary py-4 px-10 text-sm disabled:opacity-30 hover:-translate-y-0.5 transition-transform">
                {savingQuick ? 'Saving...' : 'Save and Personalize'}
              </button>
            </form>
          </div>
        )}

        {/* One concrete next action */}
        <div className="block-blue rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] reveal">
          <p className="text-xs font-semibold text-accent mb-3">Your Next Step</p>
          <h2 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-3">{action.title}</h2>
          <p className="text-sm font-medium text-text-muted leading-relaxed mb-8 max-w-xl">{action.rationale}</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link to={action.to} className="btn-primary py-4 px-10 text-sm hover:-translate-y-0.5 transition-transform">
              Let&apos;s Go
            </Link>
            {!sparse && (
              <Link to="/settings/financial" className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
                Update Your Financial Profile
              </Link>
            )}
          </div>
        </div>

        {/* Secondary nav */}
        <div className="mt-12 flex flex-wrap gap-8 reveal">
          <Link to={`/courses/${courseId}`} className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
            ← Back to Course
          </Link>
          <Link to="/courses" className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
            Browse More Courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseComplete;
