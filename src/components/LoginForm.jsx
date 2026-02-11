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

  // Sync with auth context error
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
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${isPage ? '' : ''}`}>
      <div className={`${isPage ? '' : 'mesh-card p-10 md:p-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden'}`}>
        {/* Decorative corner element */}
        {!isPage && <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 -mr-12 -mt-12 rotate-45 pointer-events-none" />}

        <div className="relative z-10">
          <div className="mb-10 text-center">
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand mb-4">Secure Access</p>
            <h2 className="text-4xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
              Sign In
            </h2>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Institutional Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@institution.com"
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Access Key
                  </label>
                  <button type="button" className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline">
                    Reset?
                  </button>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 mt-4 flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Terminal</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-12 text-center pt-8 border-t border-zinc-100 dark:border-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Not yet enrolled?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-brand hover:underline"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
