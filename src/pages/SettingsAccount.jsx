import { Link } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const SettingsAccount = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <div className="mb-12">
        <p className="font-hand text-accent text-lg -rotate-2 inline-block mb-1">your account</p>
        <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Account Settings</h2>
        <p className="text-sm font-medium text-text-dim mt-2">
          Manage your account role and preferences.
        </p>
      </div>
      <div className="space-y-12">
        <div>
          <h3 className="text-sm font-display font-bold tracking-tight text-text-primary mb-6">Access Level</h3>
          <div className="rounded-3xl bg-surface-soft p-6 sm:p-8">
            <p className="text-sm font-medium text-text-dim mb-4">
              Current role
            </p>
            <p className="mb-6 text-3xl font-display font-extrabold tracking-tight text-accent">
              {user?.role === 'admin' ? 'Strategic Admin' : user?.role === 'instructor' ? 'Lead Architect' : 'Scholar'}
            </p>
            {user?.role !== 'admin' && (
              <p className="mb-7 max-w-lg text-sm font-medium leading-relaxed text-text-muted">
                {user?.role === 'instructor'
                  ? 'Teacher access is tied to a reviewed school affiliation. You can update those details at any time.'
                  : 'Teacher tools protect student evidence. Request access with a school affiliation for review.'}
              </p>
            )}
            {user?.role !== 'admin' && (
              <Link to="/teacher/onboarding" className="btn-primary w-fit px-8 py-3">
                {user?.role === 'instructor' ? 'Manage teacher affiliation' : 'Request teacher access'}
              </Link>
            )}
          </div>
        </div>
        <section aria-labelledby="account-session-heading">
          <h3 id="account-session-heading" className="mb-6 text-sm font-display font-bold tracking-tight text-text-primary">Session</h3>
          <div className="flex flex-col gap-5 rounded-3xl bg-surface-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h4 className="text-xl font-display font-extrabold text-text-primary">Sign out of Caplet</h4>
              <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-text-muted">
                End your session on this device. Your courses, progress, and preferences will remain saved.
              </p>
            </div>
            <button type="button" onClick={logout} className="btn-secondary shrink-0 text-text-error hover:bg-surface-error">
              <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" /> Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsAccount;
