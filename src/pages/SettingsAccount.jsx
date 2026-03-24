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
      <div className="pb-8 border-b border-line-soft mb-12">
        <h2 className="text-xl font-bold uppercase tracking-tighter text-text-primary">Account Settings.</h2>
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-2">
          Manage your account role and preferences.
        </p>
      </div>
      <div className="space-y-12">
        {message.text && (
          <div
            className={`px-6 py-4 border font-bold text-[10px] uppercase tracking-widest ${message.type === 'success'
              ? 'border-accent text-accent'
              : 'border-red-500 text-red-500'
              }`}
          >
            {message.type === 'success' ? 'Success:' : 'Error:'} {message.text}
          </div>
        )}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-6">Access Level</h3>
          <div className="p-10 bg-surface-soft border border-line-soft">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">
              Current role:
            </p>
            <p className="text-3xl font-serif italic text-accent mb-8">
              {user?.role === 'admin' ? 'Strategic Admin' : user?.role === 'instructor' ? 'Lead Architect' : 'Scholar'}
            </p>
            {user?.role !== 'admin' && (
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest leading-relaxed mb-10 max-w-sm">
                You can switch between teacher and student roles to access different features.
              </p>
            )}
            {user?.role !== 'admin' && (
              <button
                type="button"
                onClick={handleSwitchRole}
                disabled={updating}
                className="btn-primary py-5 px-10 text-[10px] disabled:opacity-30"
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
