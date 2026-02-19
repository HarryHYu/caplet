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
    <div className="w-full max-w-md mx-auto reveal-text">
      <div className="mb-16">
        <span className="section-kicker">Access Terminal</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Welcome back.
        </h2>
        <p className="text-sm text-text-muted font-medium tracking-tight">Enter your credentials to synchronize with the Caplet Intelligence Registry.</p>
      </div>

      {error && (
        <div className="mb-10 p-6 bg-red-50 border-l-2 border-red-500 reveal-text animate-shake">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500 block mb-2 italic">Status Error</span>
          <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="space-y-3">
          <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
            Registry Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="IDENTIFIER@TERMINAL.COM"
            className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold uppercase tracking-widest text-xs placeholder:text-text-muted/30"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Security Key
            </label>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••••••"
            className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary text-xs placeholder:text-text-muted/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-6 mt-8 flex items-center justify-center gap-4 group"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Bypass Gate</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-20 pt-10 border-t border-line-soft space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center">
          New Registry Entry? {' '}
          <button
            onClick={onSwitchToRegister}
            className="text-accent border-b border-accent/30 hover:border-accent transition-all"
          >
            Initialize Node
          </button>
        </p>
        <div className="text-center">
          <button type="button" className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] hover:text-accent transition-colors">
            Recover Encrypted Key
          </button>
        </div>
      </div>
    </div>
  );
};


export default LoginForm;
