import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const { register, error } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Security keys do not match. Verification failed.');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword: _unused, ...userData } = formData;
      await register(userData);
      onSuccess?.();
    } catch (error) {
      console.error('Registry insertion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto reveal-text">
      <div className="mb-16">
        <span className="section-kicker">New Registry entry</span>
        <h2 className="text-5xl font-serif italic mb-4">
          Initialize node.
        </h2>
        <p className="text-sm text-text-muted font-medium tracking-tight">Create your unique identifier within the Caplet Intelligence Registry.</p>
      </div>

      {error && (
        <div className="mb-10 p-6 bg-red-50 border-l-2 border-red-500 reveal-text animate-shake">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500 block mb-2 italic">Integrity Discrepancy</span>
          <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-3">
            <label htmlFor="firstName" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Given Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="FIRST"
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold uppercase tracking-widest text-xs placeholder:text-text-muted/30"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="lastName" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Surname
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="LAST"
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-bold uppercase tracking-widest text-xs placeholder:text-text-muted/30"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim pb-4">
            Access Level
          </label>
          <div className="grid grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'student' }))}
              className={`py-5 px-6 border text-[10px] font-black uppercase tracking-[0.4em] transition-all relative overflow-hidden ${formData.role === 'student'
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-line-soft text-text-dim hover:border-text-muted'
                }`}
            >
              {formData.role === 'student' && <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:15px_15px]" />}
              Scholar
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'instructor' }))}
              className={`py-5 px-6 border text-[10px] font-black uppercase tracking-[0.4em] transition-all relative overflow-hidden ${formData.role === 'instructor'
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-line-soft text-text-dim hover:border-text-muted'
                }`}
            >
              {formData.role === 'instructor' && <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:15px_15px]" />}
              Architect
            </button>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-3">
            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Security Key
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary text-xs placeholder:text-text-muted/30"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">
              Confirm Key
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary text-xs placeholder:text-text-muted/30"
            />
          </div>
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
              <span>Request Entry</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-16 pt-10 border-t border-line-soft">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center">
          Existing Registry Entry? {' '}
          <button
            onClick={onSwitchToLogin}
            className="text-accent border-b border-accent/30 hover:border-accent transition-all"
          >
            Access Gate
          </button>
        </p>
      </div>
    </div>
  );
};


export default RegisterForm;
