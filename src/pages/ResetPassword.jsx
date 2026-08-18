import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    if (form.newPassword !== form.confirmPassword) {
      // Catch the mismatch locally rather than burning the round-trip.
      setErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await api.resetPassword({ token, ...form });
      setForm({ newPassword: '', confirmPassword: '' });
      setSuccess(true);
    } catch (error) {
      setErrors(error.validation || {});
      setMessage(error.message || 'This reset link is invalid or expired.');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 pr-12 text-text-primary outline-none focus:border-accent';
  const toggleClass = 'absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-text-dim hover:text-text-primary focus-ring press';

  return (
    <main className="min-h-[100dvh] bg-surface-body px-5 py-20">
      <div className="mx-auto max-w-md animate-rise rounded-3xl border border-line-soft bg-surface-raised p-7 shadow-card sm:p-9">
        {success ? (
          <div role="status" className="text-center">
            <span className="mx-auto grid h-14 w-14 animate-pop place-items-center rounded-2xl block-green">
              <CheckCircleIcon className="h-8 w-8 text-green" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text-primary">Password reset. You&apos;re ready to sign in.</h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">Your new password is saved. Use it to sign in to your account.</p>
            <Link to="/login" className="btn-primary press focus-ring mt-7 w-full justify-center py-3">Go to sign in</Link>
          </div>
        ) : (
          <>
            <p className="font-hand text-lg text-accent -rotate-2 inline-block">choose a new password</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text-primary">Set your password</h1>
            {message && <div role="alert" className="mt-6 animate-rise rounded-2xl bg-surface-error p-4 text-sm font-medium text-text-error">{message}</div>}
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="reset-new-password" className="block text-sm font-bold text-text-muted">New password</label>
                <div className="relative mt-2">
                  <input id="reset-new-password" type={showNew ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className={fieldClass} />
                  <button type="button" onClick={() => setShowNew((current) => !current)} aria-pressed={showNew} aria-label={showNew ? 'Hide password' : 'Show password'} className={toggleClass}>
                    {showNew ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.newPassword && <span className="mt-1 block text-xs text-text-error">{errors.newPassword}</span>}
              </div>
              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-bold text-text-muted">Confirm new password</label>
                <div className="relative mt-2">
                  <input id="reset-confirm-password" type={showConfirm ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={fieldClass} />
                  <button type="button" onClick={() => setShowConfirm((current) => !current)} aria-pressed={showConfirm} aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'} className={toggleClass}>
                    {showConfirm ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.confirmPassword && <span role="alert" className="mt-1 block text-xs text-text-error">{errors.confirmPassword}</span>}
              </div>
              <button type="submit" disabled={saving || !token} className="btn-primary press focus-ring w-full justify-center py-3 disabled:opacity-50">{saving ? 'Saving…' : 'Reset password'}</button>
            </form>
            <Link to="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-accent focus-ring rounded-md">Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}
