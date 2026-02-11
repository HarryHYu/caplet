import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SettingsProfile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        dateOfBirth: form.dateOfBirth || null,
        bio: form.bio.trim() || null,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      }
      await updateProfile(payload);
      setForm((prev) => ({ ...prev, password: '' }));
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-transparent overflow-hidden">
      <div className="pb-8 border-b border-zinc-100 dark:border-zinc-900 mb-10">
        <h2 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter">Profile Details.</h2>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
          Update identification and sequence credentials.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        {message.text && (
          <div
            className={`px-6 py-4 border font-bold text-[10px] uppercase tracking-widest ${message.type === 'success'
                ? 'border-brand text-brand'
                : 'border-red-500 text-red-500'
              }`}
          >
            {message.type === 'success' ? 'Transmission Successful:' : 'System Error:'} {message.text}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label htmlFor="firstName" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
              First Identity
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none transition-all"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="lastName" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
              Last Identity
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-3">
          <label htmlFor="email" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Communication Channel (Email)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none transition-all"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="password" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Secure Sequence (New Password)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="LEAVE BLANK TO RETAIN..."
            className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all"
          />
          <p className="mt-2 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
            Minimum 6 characters required for mutation.
          </p>
        </div>
        <div className="space-y-3">
          <label htmlFor="dateOfBirth" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Origin Date (DOB)
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-widest focus:border-brand outline-none transition-all appearance-none"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="bio" className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Identity Synopsis
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1000}
            value={form.bio}
            onChange={handleChange}
            placeholder="A FEW WORDS ABOUT YOUR FINANCIAL JOURNEY..."
            className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-[0.1em] focus:border-brand outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
              Character Count: {form.bio.length}/1000
            </p>
          </div>
        </div>
        <div className="pt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all disabled:opacity-20 flex items-center justify-center min-w-[150px]"
          >
            {saving ? 'Transmitting...' : 'Commit Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsProfile;
