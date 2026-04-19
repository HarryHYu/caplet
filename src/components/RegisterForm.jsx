import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const RegisterForm = ({ onSuccess, onSwitchToLogin, isPage = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student',
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
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
        role: formData.role,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-10">
        <span className="section-kicker">Sign up</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Join Caplet.
        </h2>
        <p className="text-lg text-text-muted font-medium tracking-tight">
          Google or email — same account if the email matches. Already registered?{' '}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-caplet-sky font-semibold hover:underline"
            >
              Log in
            </button>
          ) : null}
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className={googleLoading ? 'pointer-events-none opacity-60' : ''}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-up was cancelled or failed.')}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          width="320"
        />
      </div>
      {googleLoading && (
        <p className="mt-3 text-sm text-text-dim flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-caplet-sky/30 border-t-caplet-sky rounded-full animate-spin inline-block" />
          Continuing with Google…
        </p>
      )}

      <div className="my-10 flex items-center gap-4">
        <div className="flex-1 h-px bg-caplet-ink/10" />
        <span className="text-xs font-medium uppercase tracking-widest text-caplet-ink/40">or</span>
        <div className="flex-1 h-px bg-caplet-ink/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="reg-firstName" className="block text-sm font-medium text-caplet-ink/70">First name</label>
            <input
              id="reg-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-lastName" className="block text-sm font-medium text-caplet-ink/70">Last name</label>
            <input
              id="reg-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-email" className="block text-sm font-medium text-caplet-ink/70">Email</label>
          <input
            type="email"
            id="reg-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-role" className="block text-sm font-medium text-caplet-ink/70">I am a</label>
          <select
            id="reg-role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
          >
            <option value="student">Student / learner</option>
            <option value="instructor">Instructor / teacher</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-password" className="block text-sm font-medium text-caplet-ink/70">Password (min 6 characters)</label>
          <input
            type="password"
            id="reg-password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-caplet-ink/70">Confirm password</label>
          <input
            type="password"
            id="reg-confirm"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
            className="w-full px-0 py-3 bg-transparent border-b border-caplet-ink/15 focus:border-caplet-sky outline-none text-caplet-ink"
          />
        </div>
        <button
          type="submit"
          disabled={submitLoading || googleLoading}
          className="w-full btn-primary py-4 flex items-center justify-center gap-2 rounded-xl disabled:opacity-50"
        >
          {submitLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="font-semibold">Create account</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
