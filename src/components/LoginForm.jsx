import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

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
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-12">
        <span className="section-kicker">Login</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Welcome back.
        </h2>
        <p className="text-lg text-text-muted font-medium tracking-tight">
          Use the same email for Google and password sign-in — it is one account. New here?{' '}
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-caplet-sky font-semibold hover:underline"
            >
              Create an account
            </button>
          ) : (
            'Create an account.'
          )}
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg reveal-text animate-shake">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className={`relative flex flex-col items-stretch sm:items-start gap-4 ${busy ? 'opacity-90' : ''}`}>
        <div className={googleLoading ? 'pointer-events-none opacity-60' : ''}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="320"
          />
        </div>
        {googleLoading && (
          <p className="text-sm text-text-dim flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-caplet-sky/30 border-t-caplet-sky rounded-full animate-spin inline-block" />
            Signing you in with Google…
          </p>
        )}
      </div>

      <div className="my-10 flex items-center gap-4">
        <div className="flex-1 h-px bg-caplet-ink/10" />
        <span className="text-xs font-medium uppercase tracking-widest text-caplet-ink/40">or</span>
        <div className="flex-1 h-px bg-caplet-ink/10" />
      </div>

      <p className="text-sm text-caplet-ink/55 mb-6 leading-relaxed">
        Signed up with Google only? Your account does not have a password yet — use Google above, or after you sign in once, open{' '}
        <strong className="text-caplet-ink/80">Settings → Profile</strong> and set a password to enable email login too.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-caplet-ink/70">
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
            className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none transition-all text-caplet-ink"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-caplet-ink/70">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none transition-all text-caplet-ink"
          />
        </div>
        <button
          type="submit"
          disabled={passwordLoading || googleLoading}
          className="w-full btn-primary py-4 mt-2 flex items-center justify-center gap-2 rounded-xl disabled:opacity-50"
        >
          {passwordLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="font-semibold">Sign in with password</span>
          )}
        </button>
      </form>

      {onSwitchToRegister && (
        <p className="mt-10 text-sm text-caplet-ink/50 text-center sm:text-left">
          No account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-caplet-sky font-semibold hover:underline"
          >
            Sign up
          </button>
        </p>
      )}
    </div>
  );
};

export default LoginForm;
