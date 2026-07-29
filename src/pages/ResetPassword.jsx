import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    setSaving(true);
    try {
      const response = await api.resetPassword({ token, ...form });
      setForm({ newPassword: '', confirmPassword: '' });
      setMessage(response.message);
    } catch (error) {
      setErrors(error.validation || {});
      setMessage(error.message || 'This reset link is invalid or expired.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-surface-body px-5 py-20">
      <div className="mx-auto max-w-md rounded-3xl border border-line-soft bg-surface-raised p-7 sm:p-9">
        <p className="font-hand text-lg text-accent">choose a new password</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text-primary">Set your password</h1>
        {message && <div role={message.startsWith('Password reset') ? 'status' : 'alert'} className={`mt-6 rounded-2xl p-4 text-sm font-medium ${message.startsWith('Password reset') ? 'block-green text-text-primary' : 'bg-surface-error text-text-error'}`}>{message}</div>}
        {!message.startsWith('Password reset') && (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block text-sm font-bold text-text-muted">New password<input type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />{errors.newPassword && <span className="mt-1 block text-xs text-text-error">{errors.newPassword}</span>}</label>
            <label className="block text-sm font-bold text-text-muted">Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />{errors.confirmPassword && <span className="mt-1 block text-xs text-text-error">{errors.confirmPassword}</span>}</label>
            <button type="submit" disabled={saving || !token} className="btn-primary w-full justify-center py-3 disabled:opacity-50">{saving ? 'Saving…' : 'Reset password'}</button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-accent">Back to sign in</Link>
      </div>
    </main>
  );
}
