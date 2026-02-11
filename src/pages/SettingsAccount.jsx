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
    <div className="bg-transparent overflow-hidden">
      <div className="pb-8 border-b border-zinc-100 dark:border-zinc-900 mb-10">
        <h2 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter">Account Vectors.</h2>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
          Manage institutional roles and system preferences.
        </p>
      </div>
      <div className="space-y-12">
        {message.text && (
          <div
            className={`px-6 py-4 border font-bold text-[10px] uppercase tracking-widest ${message.type === 'success'
                ? 'border-brand text-brand'
                : 'border-red-500 text-red-500'
              }`}
          >
            {message.type === 'success' ? 'Vector Update Successful:' : 'System Conflict:'} {message.text}
          </div>
        )}
        <div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Access Protocol (Role)</h3>
          <div className="p-8 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900">
            <p className="text-sm font-medium text-black dark:text-white mb-6">
              Current identity classification: <br />
              <span className="text-2xl font-extrabold uppercase tracking-tighter text-brand">
                {user?.role === 'admin' ? 'Administrative' : user?.role === 'instructor' ? 'Educational Leader' : 'Academic Participant'}
              </span>
            </p>
            {user?.role !== 'admin' && (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed mb-8 max-w-sm">
                You may re-classify your identity to access teacher-specific curricula or student sequences.
              </p>
            )}
            {user?.role !== 'admin' && (
              <button
                type="button"
                onClick={handleSwitchRole}
                disabled={updating}
                className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all disabled:opacity-20 flex items-center justify-center min-w-[200px]"
              >
                {updating ? 'Processing...' : user?.role === 'instructor' ? 'Switch to Participant View' : 'Request Leader Access'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsAccount;
