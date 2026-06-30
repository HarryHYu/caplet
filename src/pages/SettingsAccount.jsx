import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SettingsAccount = () => {
  const { user, updateProfile } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSwitchRole = async () => {
    if (user?.role === 'admin') return;
    setUpdating(true);
    setMessage({ type: '', text: '' });
    try {
      const nextRole = user?.role === 'instructor' ? 'student' : 'instructor';
      await updateProfile({ role: nextRole });
      setMessage({ type: 'success', text: 'Role updated. You are now a ' + (nextRole === 'instructor' ? 'teacher' : 'student') + '.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update role.' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="mb-12">
        <p className="font-hand text-accent text-lg mb-1">Your account</p>
        <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Account Settings</h2>
        <p className="text-sm font-medium text-text-dim mt-2">
          Manage your account role and preferences.
        </p>
      </div>
      <div className="space-y-12">
        {message.text && (
          <div
            className={`px-6 py-4 rounded-2xl font-medium text-sm ${message.type === 'success'
              ? 'block-blue text-blue'
              : 'bg-red-50 text-error'
              }`}
          >
            {message.type === 'success' ? 'Success: ' : 'Error: '}{message.text}
          </div>
        )}
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
                You can switch between teacher and student roles to access different features.
              </p>
            )}
            {user?.role !== 'admin' && (
              <button
                type="button"
                onClick={handleSwitchRole}
                disabled={updating}
                className="btn-primary py-3 px-8 hover:-translate-y-0.5 transition-transform disabled:opacity-30"
              >
                {updating ? 'Updating...' : user?.role === 'instructor' ? 'Switch to Student' : 'Switch to Teacher'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsAccount;
