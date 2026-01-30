import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border-2 border-gray-200/50 dark:border-gray-700/50">
      <h2 className="text-2xl font-bold text-center heading-gradient mb-6">✨ Sign In</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded-xl font-medium">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Password</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
