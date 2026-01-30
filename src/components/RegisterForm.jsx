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
      const { confirmPassword, ...userData } = formData;
      await register(userData);
      onSuccess?.();
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border-2 border-gray-200/50 dark:border-gray-700/50">
      <h2 className="text-2xl font-bold text-center heading-gradient mb-6">✨ Create Account</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded-xl font-medium">⚠️ {error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">First Name</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Last Name</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Account Type</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'student' }))}
              className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                formData.role === 'student'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              I’m a student
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'instructor' }))}
              className={`py-2 px-3 rounded-md border text-sm font-medium ${
                formData.role === 'instructor'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              I’m a teacher
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Teachers can create classes and assignments. Students can join classes.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Password</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Confirm Password</label>
          <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50">
          {loading ? '⏳ Creating account...' : '✨ Create Account'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
