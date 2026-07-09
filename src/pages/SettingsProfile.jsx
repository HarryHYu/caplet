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
    <div>
      <div className="mb-10">
        <p className="font-hand text-lg text-accent -rotate-2 inline-block mb-1">your details</p>
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-text-primary">
          Profile Details
        </h2>
        <p className="text-sm font-medium text-text-dim mt-2">
          Update your personal information and account details.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 bg-surface-raised rounded-3xl p-8 sm:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
        {message.text && (
          <div
            className={`px-6 py-4 rounded-2xl font-semibold text-sm ${message.type === 'success'
              ? 'block-blue text-blue'
              : 'bg-red-50 text-red-600'
              }`}
          >
            {message.type === 'success' ? 'Success:' : 'Error:'} {message.text}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label htmlFor="firstName" className="block text-sm font-semibold text-text-dim">
              Given Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="lastName" className="block text-sm font-semibold text-text-dim">
              Surname
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm"
            />
          </div>
        </div>
        <div className="space-y-3">
          <label htmlFor="email" className="block text-sm font-semibold text-text-dim">
            Registry Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="password" className="block text-sm font-semibold text-text-dim">
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Leave blank to keep current"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary text-sm placeholder:text-text-muted/40"
          />
          <p className="mt-2 text-xs font-medium text-text-dim">
            At least 6 characters. Google-only accounts can set a password here to enable email login too.
          </p>
        </div>
        <div className="space-y-3">
          <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-text-dim">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm appearance-none"
          />
        </div>
        <div className="space-y-3">
          <label htmlFor="bio" className="block text-sm font-semibold text-text-dim">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1000}
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary text-sm placeholder:text-text-muted/40 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs font-medium text-text-dim">
              {form.bio.length}/1000 characters
            </p>
          </div>
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-4 px-10 text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsProfile;
