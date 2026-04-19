import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onSuccess, isPage = false }) => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, error: authError } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError('No credential returned from Google.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-16">
        <span className="section-kicker">Login</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Welcome back.
        </h2>
        <p className="text-lg text-text-muted font-medium tracking-tight">
          Sign in with your Google account to access classes and courses. New here? The same button creates your account.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg reveal-text animate-shake">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="relative flex flex-col items-stretch sm:items-start gap-4">
        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
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
        {loading && (
          <p className="text-sm text-text-dim flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-caplet-sky/30 border-t-caplet-sky rounded-full animate-spin inline-block" />
            Signing you in…
          </p>
        )}
      </div>

      <p className="mt-12 text-sm text-text-dim text-center sm:text-left">
        More sign-in options (for example Microsoft) may be added later.
      </p>
    </div>
  );
};

export default LoginForm;
