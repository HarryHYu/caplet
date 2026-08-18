import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const NEUTRAL_SENT_COPY = 'If an account can use that email, a password reset link will be sent shortly.';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      // Only a 2xx response earns the neutral "check your email" copy. A
      // network or server failure means no email is coming — surface it as a
      // retryable error instead of masking it as success.
      const response = await api.requestPasswordReset(email);
      setMessage(response?.message || NEUTRAL_SENT_COPY);
      setSent(true);
    } catch {
      setError('We could not send the reset email. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-surface-body px-5 py-20">
      <div className="mx-auto max-w-md animate-rise rounded-3xl border border-line-soft bg-surface-raised p-7 shadow-card sm:p-9">
        <p className="font-hand text-lg text-accent">password help</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text-primary">Reset your password</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">Enter your email. If it can be used for password sign-in, Caplet will send a private one-hour reset link.</p>
        {sent ? (
          <div role="status" className="mt-6 animate-rise rounded-2xl block-green p-4 text-sm font-medium text-text-primary">{message}</div>
        ) : (
          <form onSubmit={submit} className="mt-7">
            {error && (
              <div role="alert" className="mb-5 animate-rise rounded-2xl bg-surface-error p-4 text-sm font-medium text-text-error">{error}</div>
            )}
            <label htmlFor="reset-email" className="text-sm font-bold text-text-muted">Email</label>
            <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />
            <button type="submit" disabled={sending} className="btn-primary press focus-ring mt-5 w-full justify-center py-3 disabled:opacity-50">
              {sending ? 'Sending…' : error ? 'Try again' : 'Send reset link'}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-accent focus-ring rounded-md">Back to sign in</Link>
      </div>
    </main>
  );
}
