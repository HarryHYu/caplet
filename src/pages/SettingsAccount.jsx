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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Role and account preferences.
        </p>
      </div>
      <div className="p-6 space-y-6">
        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Account role</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            You are currently signed in as{' '}
            <span className="font-medium">
              {user?.role === 'admin' ? 'Admin' : user?.role === 'instructor' ? 'Teacher' : 'Student'}
            </span>.
            {user?.role !== 'admin' && (
              <> You can switch between student and teacher to access classes as either role.</>
            )}
          </p>
          {user?.role !== 'admin' && (
            <button
              type="button"
              onClick={handleSwitchRole}
              disabled={updating}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {updating ? 'Updating…' : user?.role === 'instructor' ? 'Switch to student account' : 'Switch to teacher account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsAccount;
