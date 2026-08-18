import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Same dismissible save-notice pattern as SettingsPrivacy's StatusNotice.
function StatusNotice({ notice, onDismiss }) {
  if (!notice?.text) return null;
  const isError = notice.type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-3 rounded-2xl px-5 py-4 text-sm font-bold animate-rise ${isError ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}
    >
      {isError ? <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mark-green)]" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{notice.text}</span>
      <button type="button" onClick={onDismiss} className="press shrink-0 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Dismiss message">
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

const inputClass = 'w-full px-4 py-3 rounded-xl bg-surface-soft border border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

const SettingsProfile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    bio: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);

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
    setNotice(null);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        dateOfBirth: form.dateOfBirth || null,
        bio: form.bio.trim() || null,
      };
      await updateProfile(payload);
      setNotice({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'The new password and its confirmation do not match.' });
      return;
    }
    setSavingPassword(true);
    setPasswordNotice(null);
    try {
      const response = await api.changePassword(passwordForm);
      if (response?.token) api.setToken(response.token);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordNotice({ type: 'success', text: 'Password updated. Other signed-in sessions have been ended.' });
    } catch (error) {
      setPasswordNotice({ type: 'error', text: error.message || 'Your password could not be updated.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <div className="mb-10">
        <p className="font-hand text-lg text-accent -rotate-2 inline-block mb-1">your details</p>
        <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Profile details</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">
          Update your personal information and account details.
        </p>
      </div>

      <section className="border-b border-line-soft pb-10" aria-labelledby="personal-details-heading">
        <h3 id="personal-details-heading" className="mb-6 text-xl font-display font-extrabold tracking-tight text-text-primary">Personal information</h3>
        <StatusNotice notice={notice} onDismiss={() => setNotice(null)} />
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label htmlFor="firstName" className="block text-sm font-semibold text-text-dim">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={form.firstName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="lastName" className="block text-sm font-semibold text-text-dim">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={form.lastName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor="email" className="block text-sm font-semibold text-text-dim">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-text-dim">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              required={!user?.dateOfBirth}
              disabled={Boolean(user?.dateOfBirth)}
              max={new Date().toISOString().slice(0, 10)}
              autoComplete="bday"
              className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:opacity-60`}
            />
            <p className="text-xs font-medium leading-relaxed text-text-dim">Used for age-appropriate privacy safeguards and never displayed publicly. Once set, contact support to correct it.</p>
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
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary press py-4 px-10 text-sm disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="pt-10" aria-labelledby="password-heading">
        <h3 id="password-heading" className="text-xl font-display font-extrabold tracking-tight text-text-primary">Password</h3>
        <p className="mt-2 max-w-2xl text-sm font-medium text-text-dim">
          Use your current password to make a change. If you signed up with Google or cannot remember it, use the secure email link.
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-7 space-y-5">
          <StatusNotice notice={passwordNotice} onDismiss={() => setPasswordNotice(null)} />
          <div>
            <label htmlFor="currentPassword" className="mb-2 block text-sm font-semibold text-text-dim">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required={user?.passwordLoginEnabled !== false} className="w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-text-dim">New password</label>
              <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required className="w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-text-dim">Confirm new password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required className="w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={savingPassword} className="btn-primary press px-7 py-3 text-sm disabled:opacity-40">{savingPassword ? 'Updating…' : 'Update password'}</button>
            <Link to="/forgot-password" className="focus-ring min-h-11 content-center rounded-lg text-sm font-bold text-accent hover:underline">Send me a secure setup link</Link>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SettingsProfile;
