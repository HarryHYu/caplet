import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';

const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="mb-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm"
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-semibold">We could not sign you in</p>
      <p className="mt-1 text-sm leading-relaxed">{message}</p>
    </div>
  );
};

const LoginForm = ({ onSuccess, onSwitchToRegister, isPage = false }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { login, loginWithGoogle, error: authError } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordLoading(true);
    try {
      await login(formData.email, formData.password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your details and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError('Google did not return the credential we need. Please try again.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again, or use your email and password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = googleLoading || passwordLoading;

  return (
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-8">
        <span className="section-kicker">Welcome back</span>
        <h2 className="text-4xl sm:text-5xl font-serif italic mb-4 text-text-primary">
          Sign in to Caplet.
        </h2>
        <p className="text-base leading-relaxed text-text-muted">
          Pick up where you left off with lessons, calculators, and class progress saved to your account.
        </p>
      </div>

      <ErrorMessage message={error} />

      <div className={`rounded-3xl border border-line-soft bg-white/70 p-4 shadow-sm ${busy ? 'opacity-90' : ''}`}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-text-primary">Continue with Google</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Fastest option if your Caplet account uses the same email.
            </p>
          </div>
          {googleLoading && (
            <span className="mt-1 h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" aria-hidden="true" />
          )}
        </div>
        <div className={`google-login-shell overflow-hidden rounded-2xl ${googleLoading ? 'pointer-events-none opacity-60' : ''}`}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed. Please try again.')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="pill"
            width="360"
          />
        </div>
        {googleLoading && (
          <p className="mt-3 text-sm text-text-dim" aria-live="polite">
            Signing you in with Google…
          </p>
        )}
      </div>

      <div className="my-8 flex items-center gap-4" aria-hidden="true">
        <div className="h-px flex-1 bg-line-soft" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">or use email</span>
        <div className="h-px flex-1 bg-line-soft" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={passwordLoading}>
        <Input
          type="email"
          id="email"
          name="email"
          label="Email address"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="username"
          placeholder="you@example.com"
        />
        <Input
          type="password"
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          hint="If you originally joined with Google, continue with Google above or set a password from Settings after signing in."
        />
        <Button
          type="submit"
          disabled={passwordLoading || googleLoading}
          isLoading={passwordLoading}
          className="w-full"
        >
          {passwordLoading ? 'Signing in…' : 'Sign in with password'}
        </Button>
      </form>

      {onSwitchToRegister && (
        <div className="mt-8 rounded-2xl bg-surface-soft/70 px-5 py-4 text-center text-sm text-text-muted">
          New to Caplet?{' '}
          <Button type="button" onClick={onSwitchToRegister} variant="ghost" className="-my-3 px-2 py-2">
            Create an account
          </Button>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
