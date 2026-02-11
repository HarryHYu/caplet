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
      alert('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword: _unused, ...userData } = formData;
      await register(userData);
      onSuccess?.();
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="mesh-card p-10 md:p-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 -mr-16 -mt-16 rotate-45 pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-10 text-center">
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand mb-4">New Enrollment</p>
            <h2 className="text-4xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
              Create Account
            </h2>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Given Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Surname
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Institutional Role
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role: 'student' }))}
                  className={`flex-1 py-3 px-4 border text-[10px] font-bold uppercase tracking-widest transition-all ${formData.role === 'student'
                    ? 'border-brand bg-brand text-white shadow-lg'
                    : 'border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300'
                    }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role: 'instructor' }))}
                  className={`flex-1 py-3 px-4 border text-[10px] font-bold uppercase tracking-widest transition-all ${formData.role === 'instructor'
                    ? 'border-brand bg-brand text-white shadow-lg'
                    : 'border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300'
                    }`}
                >
                  Faculty
                </button>
              </div>
            </div>

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
                className="w-full px-0 py-2 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Access Key
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
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
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
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800 focus:border-brand outline-none transition-all text-black dark:text-white font-medium"
                />
              </div>
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
                  <span>Begin Enrollment</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-zinc-100 dark:border-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Already enrolled?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-brand hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
