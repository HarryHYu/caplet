import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onSuccess, onSwitchToRegister, isPage = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, error: authError } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Verification failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full mx-auto reveal-text ${isPage ? 'max-w-xl' : 'max-w-md'}`}>
      <div className="mb-16">
        <span className="section-kicker">Login Page</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Welcome back.
        </h2>
        <p className="text-lg text-text-muted font-medium tracking-tight">Enter your username and password to access to classes and courses.</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg reveal-text animate-shake">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-text-dim">
            Email Address
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
            className="w-full px-0 py-3 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary text-base placeholder:text-text-muted/30"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="block text-sm font-medium text-text-dim">
              Password
            </label>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="w-full px-0 py-3 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary text-base placeholder:text-text-muted/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-4 mt-8 flex items-center justify-center gap-2 group rounded-xl"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="font-semibold text-base">Login</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-16 pt-8 border-t border-line-soft space-y-6">
        <p className="text-sm font-medium text-text-dim text-center">
          New to Caplet? {' '}
          <button
            onClick={onSwitchToRegister}
            className="text-accent hover:text-accent-strong transition-colors font-semibold"
          >
            Sign up for free
          </button>
        </p>
        <div className="text-center">
          <button type="button" className="text-sm text-text-dim hover:text-accent transition-colors">
            Forgot your password?
          </button>
        </div>
      </div>
    </div>
  );
};


export default LoginForm;
