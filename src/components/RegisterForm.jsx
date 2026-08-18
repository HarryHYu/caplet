import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, loginWithGoogle, error: authError } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError('No credential returned from Google.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Sign-up failed. If you already have an account, try logging in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitLoading(true);
    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="w-full">

      {/* Heading */}
      <div className="mb-8">
        <p className="mb-1 font-hand text-lg text-accent -rotate-2 inline-block">Welcome aboard</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-primary mb-2">
          Create your account
        </h1>
        <p className="flex flex-wrap items-center gap-x-1 text-sm text-text-muted">
          <span>Already registered?</span>
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline"
            >
              Sign in
            </button>
          ) : null}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-6 rounded-2xl bg-surface-error p-4 shadow-card animate-rise">
          <p className="text-sm font-medium text-text-error">{error}</p>
        </div>
      )}

      <div className={`w-full ${submitLoading || googleLoading ? 'opacity-80' : ''}`}>
        <div className={`google-auth-button w-full ${googleLoading ? 'pointer-events-none opacity-60' : ''}`}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was cancelled or failed.')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>
        {googleLoading && (
          <p className="mt-3 text-sm text-text-dim flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
            Continuing with Google…
          </p>
        )}
      </div>

      <div className="my-7 flex items-center gap-4">
        <div className="flex-1 h-px bg-line-soft/60" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-dim">Or</span>
        <div className="flex-1 h-px bg-line-soft/60" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="reg-firstName" className="block text-sm font-medium text-text-muted">First name</label>
            <input
              id="reg-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-lastName" className="block text-sm font-medium text-text-muted">Last name</label>
            <input
              id="reg-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-sm font-medium text-text-muted">Email</label>
          <input
            type="email"
            id="reg-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm placeholder:text-text-dim"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-date-of-birth" className="block text-sm font-medium text-text-muted">Date of birth</label>
          <input
            type="date"
            id="reg-date-of-birth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            className="w-full px-4 py-3 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm"
          />
          <p className="text-xs font-medium leading-relaxed text-text-dim">Used to apply age-appropriate privacy controls. It is not shown publicly.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-sm font-medium text-text-muted">Password (at least 8 characters)</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="reg-password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm placeholder:text-text-dim"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-text-dim hover:text-text-primary focus-ring press"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-text-muted">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              id="reg-confirm"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 bg-surface-soft border border-line-soft focus:border-accent focus:bg-surface-raised outline-none transition-all text-text-primary rounded-xl text-sm placeholder:text-text-dim"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((current) => !current)}
              aria-pressed={showConfirm}
              aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-text-dim hover:text-text-primary focus-ring press"
            >
              {showConfirm ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitLoading || googleLoading}
          aria-busy={submitLoading}
          className="w-full btn-primary py-4 flex items-center justify-center gap-2 rounded-2xl press disabled:opacity-50"
        >
          {submitLoading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-text-contrast/30 border-t-text-contrast" aria-hidden="true" />
              <span>Creating account…</span>
            </>
          ) : (
            <span className="font-semibold">Create account</span>
          )}
        </button>
        <p className="text-center text-xs font-medium leading-relaxed text-text-dim">
          By creating an account, you agree to Caplet&apos;s{' '}
          <Link to="/terms" className="font-bold text-accent hover:text-accent-strong focus-ring rounded-md">terms of use</Link>
          {' '}and{' '}
          <Link to="/trust" className="font-bold text-accent hover:text-accent-strong focus-ring rounded-md">trust and privacy information</Link>.
        </p>
      </form>
    </div>
  );
};

export default RegisterForm;
