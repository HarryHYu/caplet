import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import ClassIcon from '../components/ClassIcon';
import { useReveal } from '../lib/useReveal';
import useDialogFocus from '../lib/useDialogFocus';
import { InlineEmpty } from '../components/learning/LearningStates';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';

/** Small spinner for in-flight submit buttons. */
const ButtonSpinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

/**
 * Accessible modal shell: role="dialog" + aria-modal, closes on Escape,
 * moves focus into the dialog on open and restores it on close.
 */
const ModalShell = ({ labelledBy, onClose, maxWidthClass = 'max-w-lg', children }) => {
  // useDialogFocus keeps onClose in a ref with empty deps. A local effect
  // keyed on [onClose] re-ran on every parent render (onClose is an inline
  // arrow, and the inputs are parent state), yanking focus out of the field
  // after every keystroke — these forms were untypeable.
  const dialogRef = useDialogFocus({ onDismiss: onClose });

  return (
    <div className="fixed inset-0 bg-surface-body/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-surface-raised rounded-3xl ${maxWidthClass} w-full p-12 shadow-pop animate-pop outline-none`}
      >
        {children}
      </div>
    </div>
  );
};

const Classes = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState({ teaching: [], student: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');

  // Re-run once content renders (past the loading gate), else there are no
  // .reveal elements on mount and nothing animates.
  useReveal(undefined, [loading]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getClasses();
        setClasses(data);
      } catch (e) {
        console.error('Error loading classes:', e);
        setError(e.message || 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const isTeacher = user?.role === 'instructor' || user?.role === 'admin';

  const refreshClasses = async () => {
    const data = await api.getClasses();
    setClasses(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting || !createForm.name.trim()) return;
    setSubmitting(true);
    setCreateError('');
    try {
      await api.createClass({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
      });
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      await refreshClasses();
    } catch (err) {
      console.error('Create class error:', err);
      setCreateError(err.message || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (submitting || !joinCode.trim()) return;
    setSubmitting(true);
    setJoinError('');
    try {
      const res = await api.joinClass(joinCode.trim());
      setShowJoin(false);
      setJoinCode('');
      await refreshClasses();
      navigate(`/classes/${res.classroom.id}`);
    } catch (err) {
      console.error('Join class error:', err);
      setJoinError(err.message || 'Failed to join class');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setCreateError('');
    setShowCreate(true);
  };

  const openJoin = () => {
    if (!isAuthenticated) return navigate('/login');
    setJoinError('');
    setShowJoin(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading classes…" />
      </div>
    );
  }

  return (
    <div className="minimal-page selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        {/* Header Section */}
        <header data-tour-id="academy-header" className="minimal-page-header flex flex-col justify-between gap-8 md:flex-row md:items-end reveal">
          <div>
            <span className="section-kicker">Learn together</span>
            <h1 className="minimal-page-title">Classes</h1>
            <p className="minimal-page-description">
              {isTeacher ? 'Manage the classes you teach.' : 'Join a class or manage one you teach.'}
            </p>
          </div>
          <div data-tour-id="academy-actions" className="flex items-center gap-3">
            {isTeacher && (
              <Link
                to="/curriculum-studio"
                className="btn-secondary press px-6 py-2.5 text-sm"
              >
                Curriculum Studio
              </Link>
            )}
            {isTeacher && (
              <button
                onClick={openCreate}
                className="btn-primary press px-6 py-2.5 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create class
              </button>
            )}
            {/* Teachers cannot join classes as students (the server rejects the
                request), so the join action is student-only. */}
            {!isTeacher && (
              <button
                onClick={openJoin}
                className="btn-primary press px-6 py-2.5 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Join class
              </button>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-20 p-6 rounded-2xl bg-surface-error text-text-error text-sm font-medium flex items-center gap-4 shadow-card animate-shake-x reveal">
            <span className="w-2 h-2 bg-text-error rounded-full animate-pulse" aria-hidden="true" />
            Something went wrong: {error}
          </div>
        )}

        {isTeacher && (
          <section className="mb-32 reveal">
            <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">
              Classes you teach
            </h2>
            {classes.teaching.length === 0 ? (
              <InlineEmpty
                icon={AcademicCapIcon}
                title="No classes yet"
                message="Create a class to set work, track evidence and see how the group is going."
                action={<button type="button" onClick={openCreate} className="btn-primary press">Create a class</button>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal-stagger">
                {classes.teaching.map((cls) => (
                  <Link key={cls.id} to={`/classes/${cls.id}`} className="block-blue rounded-3xl p-10 group flex flex-col justify-between shadow-card card-lift focus-ring">
                    <div>
                      <div className="flex justify-between items-start mb-12 gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <ClassIcon name={cls.name} size="lg" />
                          <h3 className="min-w-0 font-display font-bold tracking-tight text-3xl">{cls.name}</h3>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-accent text-accent-contrast shrink-0">Owner</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-8">
                      <span className="text-sm font-medium text-text-dim">Class code</span>
                      <span className="text-xs font-bold font-mono tracking-widest text-accent">
                        {cls.code}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="reveal">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">
            Classes you're in
          </h2>
          {classes.student.length === 0 ? (
            <InlineEmpty
              icon={UserGroupIcon}
              title={isTeacher ? "You're not in any classes" : 'Join your first class'}
              message="Ask your teacher for the class code — joining links your work to the class."
              action={<button type="button" onClick={openJoin} className="btn-primary press">Join a class</button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal-stagger">
              {classes.student.map((cls) => (
                <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-raised rounded-3xl p-10 group flex flex-col justify-between shadow-card card-lift focus-ring">
                  <div>
                      <div className="flex justify-between items-start mb-12 gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <ClassIcon name={cls.name} size="lg" />
                          <h3 className="min-w-0 font-display font-bold tracking-tight text-3xl">{cls.name}</h3>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-surface-soft text-text-dim shrink-0">Member</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-8">
                    <span className="text-sm font-medium text-text-dim">Class code</span>
                    <span className="text-xs font-bold font-mono tracking-widest text-accent">
                      {cls.code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Modals */}
        {showCreate && (
          <ModalShell labelledBy="create-class-heading" onClose={() => setShowCreate(false)}>
            <div className="flex items-center justify-between mb-16">
              <h2 id="create-class-heading" className="font-display font-bold tracking-tight text-4xl">Create a Class</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-text-dim hover:text-accent transition-colors focus-ring rounded-lg" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {createError && (
              <div key={createError} role="alert" className="mb-8 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error animate-shake-x">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-12">
              <div>
                <label htmlFor="create-class-name" className="text-sm font-semibold text-text-dim mb-4 block">Class Name</label>
                <input
                  id="create-class-name"
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-surface-soft border border-line-soft rounded-xl px-6 py-4 text-sm font-medium outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="create-class-description" className="text-sm font-semibold text-text-dim mb-4 block">Description (Optional)</label>
                <textarea
                  id="create-class-description"
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-surface-soft border border-line-soft rounded-xl px-6 py-4 text-sm font-medium outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary press py-3 text-sm" disabled={submitting}>Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || !createForm.name.trim()}
                  className="btn-primary press py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <ButtonSpinner />}
                  {submitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {showJoin && (
          <ModalShell labelledBy="join-class-heading" onClose={() => setShowJoin(false)} maxWidthClass="max-w-sm">
            <div className="flex items-center justify-between mb-16">
              <h2 id="join-class-heading" className="font-display font-bold tracking-tight text-4xl">Join a Class</h2>
              <button type="button" onClick={() => setShowJoin(false)} className="text-text-dim hover:text-accent transition-colors focus-ring rounded-lg" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {joinError && (
              <div key={joinError} role="alert" className="mb-8 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error animate-shake-x">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoin} className="space-y-20">
              <div className="text-center">
                <label htmlFor="join-class-code" className="text-sm font-semibold text-text-dim mb-8 block">Enter Your Class Code</label>
                <input
                  id="join-class-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-surface-soft rounded-xl text-center text-5xl font-display font-extrabold tracking-tight outline-none border border-line-soft focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent py-6 transition-all"
                  placeholder="CODE"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !joinCode.trim()}
                className="w-full btn-primary press py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && <ButtonSpinner />}
                {submitting ? 'Verifying...' : 'Join Class'}
              </button>
            </form>
          </ModalShell>
        )}
      </div>
    </div>
  );
};

export default Classes;
