import { Link } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const SettingsAccount = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 font-hand text-lg text-accent -rotate-2 inline-block">your account</p>
        <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Account settings</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">
          Manage your account type and sign-in session.
        </p>
      </div>
      <section className="surface-card md:p-8" aria-labelledby="account-type-heading">
        <h3 id="account-type-heading" className="text-xl font-display font-extrabold tracking-tight text-text-primary">Account type</h3>
        <p className="card-section-title mt-6">Current role</p>
        <p className="font-display text-4xl font-extrabold tracking-tight text-accent">
          {user?.role === 'admin' ? 'Administrator' : user?.role === 'instructor' ? 'Teacher' : 'Student'}
        </p>
        {user?.role !== 'admin' && (
          <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-text-muted">
            {user?.role === 'instructor'
              ? 'Teacher access is tied to a reviewed school affiliation. You can update those details at any time.'
              : 'Teacher tools protect student evidence. Request access with a school affiliation for review.'}
          </p>
        )}
        {user?.role !== 'admin' && (
          <Link to="/teacher/onboarding" className="btn-primary press mt-6 w-fit px-8 py-3">
            {user?.role === 'instructor' ? 'Manage teacher affiliation' : 'Request teacher access'}
          </Link>
        )}
      </section>
      <section className="surface-card md:p-8" aria-labelledby="account-session-heading">
        <h3 id="account-session-heading" className="mb-6 text-xl font-display font-extrabold tracking-tight text-text-primary">Session</h3>
        <div className="flex flex-col gap-5 rounded-2xl border border-line-soft bg-surface-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-display font-extrabold text-text-primary">Sign out of Caplet</h4>
            <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-text-muted">
              End your session on this device. Your courses, progress, and preferences will remain saved.
            </p>
          </div>
          <button type="button" onClick={logout} className="btn-secondary press shrink-0 text-text-error hover:bg-surface-error">
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" /> Sign out
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsAccount;
