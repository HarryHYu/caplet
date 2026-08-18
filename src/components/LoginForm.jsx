import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.message || 'Invalid email or password.');
    } finally {
      setPasswordLoading(false);
    }
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
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = googleLoading || passwordLoading;

  return (
    <div className="w-full">

      {/* Heading */}
      <div className="mb-8">
        <p className="mb-1 font-hand text-lg text-accent -rotate-2 inline-block">Good to see you</p>
        <h1 className="text-4xl font-display font-extrabold text-text-primary tracking-tight mb-2">
          Welcome back.
        </h1>
        <p className="text-sm text-text-muted">
          New here?{' '}
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-accent font-semibold hover:underline focus-ring rounded-md"
            >
              Create an account
            </button>
          ) : (
            <span className="text-accent font-semibold">Create an account.</span>
          )}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-6 p-4 bg-surface-error rounded-2xl shadow-card animate-rise">
          <p className="text-sm font-medium text-text-error">{error}</p>
        </div>
      )}

      {/* Google */}
      <div className={`w-full ${busy ? 'opacity-80' : ''}`}>
        <div className={`google-auth-button w-full ${googleLoading ? 'pointer-events-none opacity-60' : ''}`}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>
        {googleLoading && (
          <p className="text-sm text-text-muted flex items-center gap-2 mt-3">
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
            Signing you in with Google.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="my-7 flex items-center gap-4">
        <div className="flex-1 h-px bg-line-soft" />
        <span className="text-xs font-medium text-text-muted">or</span>
        <div className="flex-1 h-px bg-line-soft" />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-text-muted">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="username"
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-surface-raised border border-line-soft focus:border-accent outline-none transition-all text-text-primary rounded-xl text-sm placeholder:text-text-dim"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text-muted">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-accent hover:underline focus-ring rounded-md">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 bg-surface-raised border border-line-soft focus:border-accent outline-none transition-all text-text-primary rounded-xl text-sm placeholder:text-text-dim"
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
        <button
          type="submit"
          disabled={busy}
          aria-busy={passwordLoading}
          className="w-full btn-primary py-4 text-base rounded-2xl press disabled:opacity-50 flex items-center justify-center gap-2 focus-ring"
        >
          {passwordLoading ? (
            <>
              <span className="w-5 h-5 border-2 border-text-contrast/30 border-t-text-contrast rounded-full animate-spin" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>

    </div>
  );
};

export default LoginForm;
