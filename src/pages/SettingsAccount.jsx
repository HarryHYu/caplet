import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SettingsAccount = () => {
  const { user } = useAuth();

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
          <div className="p-10 bg-surface-raised rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <p className="text-sm font-medium text-text-dim mb-4">
              Current role
            </p>
            <p className="text-3xl font-display font-extrabold tracking-tight text-accent mb-8">
              {user?.role === 'admin' ? 'Strategic Admin' : user?.role === 'instructor' ? 'Lead Architect' : 'Scholar'}
            </p>
            {user?.role !== 'admin' && (
              <p className="text-sm font-medium text-text-dim leading-relaxed mb-10 max-w-sm">
                {user?.role === 'instructor'
                  ? 'Teacher access is tied to a reviewed school affiliation. You can update those details at any time.'
                  : 'Teacher tools protect student evidence. Request access with a school affiliation for review.'}
              </p>
            )}
            {user?.role !== 'admin' && (
              <Link to="/teacher/onboarding" className="btn-primary py-3 px-8 hover:-translate-y-0.5 transition-transform">
                {user?.role === 'instructor' ? 'Manage teacher affiliation' : 'Request teacher access'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsAccount;
