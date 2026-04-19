import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SettingsProfile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
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
      await updateProfile(payload);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="pb-8 border-b border-line-soft mb-12">
        <h2 className="text-xl font-bold uppercase tracking-tighter text-text-primary">Profile Details.</h2>
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-2">
          Update your personal information and account details.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-10">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label htmlFor="firstName" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Given Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold text-xs uppercase tracking-widest"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="lastName" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Surname
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold text-xs uppercase tracking-widest"
            />
          </div>
        </div>
        <div className="space-y-3">
          <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
            Registry Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold text-xs uppercase tracking-widest"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="dateOfBirth" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold text-xs uppercase tracking-widest appearance-none"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="bio" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
            Professional Dossier
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1000}
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            className="w-full px-6 py-5 bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary text-xs tracking-wide placeholder:text-text-muted/30 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
              Characters: {form.bio.length}/1000
            </p>
          </div>
        </div>
        <div className="pt-8">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-5 px-10 text-[10px] disabled:opacity-30"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsProfile;
