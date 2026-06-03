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
      <p className="text-sm font-semibold">Please review your details</p>
      <p className="mt-1 text-sm leading-relaxed">{message}</p>
    </div>
  );
};

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
      setError('Google did not return the credential we need. Please try again.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Google sign-up failed. If you already have an account, try logging in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please enter the same password in both password fields.');
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
      setError(err.message || 'Could not create your account. Please check your details and try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const busy = googleLoading || submitLoading;

  return (
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-8">
        <span className="section-kicker">Start learning</span>
        <h2 className="text-4xl sm:text-5xl font-serif italic mb-4 text-text-primary">
          Create your account.
        </h2>
        <p className="text-base leading-relaxed text-text-muted">
          Join Caplet for guided money lessons, practical tools, and a calmer way to build financial confidence.
        </p>
      </div>

      <ErrorMessage message={error} />

      <div className={`rounded-3xl border border-line-soft bg-white/70 p-4 shadow-sm ${busy ? 'opacity-90' : ''}`}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-text-primary">Continue with Google</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              We will connect it to an existing Caplet account if the email already matches.
            </p>
          </div>
          {googleLoading && (
            <span className="mt-1 h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" aria-hidden="true" />
          )}
        </div>
        <div className={`google-login-shell overflow-hidden rounded-2xl ${googleLoading ? 'pointer-events-none opacity-60' : ''}`}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was cancelled or failed. Please try again.')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="pill"
            width="360"
          />
        </div>
        {googleLoading && (
          <p className="mt-3 text-sm text-text-dim" aria-live="polite">
            Continuing with Google…
          </p>
        )}
      </div>

      <div className="my-8 flex items-center gap-4" aria-hidden="true">
        <div className="h-px flex-1 bg-line-soft" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">or use email</span>
        <div className="h-px flex-1 bg-line-soft" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={submitLoading}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            id="reg-firstName"
            name="firstName"
            label="First name"
            value={formData.firstName}
            onChange={handleChange}
            required
            autoComplete="given-name"
            placeholder="Alex"
          />
          <Input
            id="reg-lastName"
            name="lastName"
            label="Last name"
            value={formData.lastName}
            onChange={handleChange}
            required
            autoComplete="family-name"
            placeholder="Taylor"
          />
        </div>
        <Input
          type="email"
          id="reg-email"
          name="email"
          label="Email address"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <div className="relative">
          <Input
            as="select"
            id="reg-role"
            name="role"
            label="I am a"
            value={formData.role}
            onChange={handleChange}
            hint="This helps us tailor the language and classroom features you see."
          >
            <option value="student">Student / learner</option>
            <option value="instructor">Instructor / teacher</option>
          </Input>
          <span className="pointer-events-none absolute right-4 top-[2.9rem] text-text-dim" aria-hidden="true">
            ▾
          </span>
        </div>
        <Input
          type="password"
          id="reg-password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Create a password"
          hint="Use at least 6 characters."
        />
        <Input
          type="password"
          id="reg-confirm"
          name="confirmPassword"
          label="Confirm password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
        />
        <Button type="submit" disabled={submitLoading || googleLoading} isLoading={submitLoading} className="w-full">
          {submitLoading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-8 rounded-2xl bg-surface-soft/70 px-5 py-4 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Button type="button" onClick={onSwitchToLogin} variant="ghost" className="-my-3 px-2 py-2">
            Log in
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
