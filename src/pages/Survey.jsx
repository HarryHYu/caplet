import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Survey = () => {
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    age: '',
    tracksSpending: '',
    taughtAtSchool: '',
    confidence: '',
    termsConfusing: '',
    helpfulExplanations: []
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ageOptions = [
    'Under 18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+'
  ];

  const explanationOptions = [
    'Step-by-step breakdowns',
    'Real-world examples',
    'Simple definitions',
    'Short videos',
    'Interactive tools'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (option) => {
    setFormData(prev => {
      const current = prev.helpfulExplanations;
      const updated = current.includes(option)
        ? current.filter(item => item !== option)
        : [...current, option];
      return {
        ...prev,
        helpfulExplanations: updated
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate helpful explanations
    if (formData.helpfulExplanations.length === 0) {
      setError('Please select at least one explanation type that helps you understand financial concepts.');
      setLoading(false);
      return;
    }

    try {
      await api.submitSurvey(formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit survey. Please try again.');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Thank You!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your responses have been recorded. We appreciate your feedback and will use it to improve our platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/survey-results" className="btn-primary">
                View Survey Results
              </Link>
              <Link to={isAuthenticated ? '/courses' : '/'} className="btn-secondary">
                {isAuthenticated ? 'Return to Courses' : 'Return to Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Financial Literacy Survey</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Help us understand your financial education needs. Your responses are anonymous and will help us improve our content.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How old are you? <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select age range</option>
                  {ageOptions.map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              {/* Track Spending */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Do you track your spending? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tracksSpending"
                      value="yes"
                      checked={formData.tracksSpending === 'yes'}
                      onChange={(e) => handleChange('tracksSpending', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tracksSpending"
                      value="no"
                      checked={formData.tracksSpending === 'no'}
                      onChange={(e) => handleChange('tracksSpending', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Taught at School */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Have you ever been taught financial concepts at school? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="taughtAtSchool"
                      value="yes"
                      checked={formData.taughtAtSchool === 'yes'}
                      onChange={(e) => handleChange('taughtAtSchool', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="taughtAtSchool"
                      value="no"
                      checked={formData.taughtAtSchool === 'no'}
                      onChange={(e) => handleChange('taughtAtSchool', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Confidence Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How confident are you in understanding basic financial concepts? <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.confidence}
                    onChange={(e) => handleChange('confidence', e.target.value)}
                    required
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">10</span>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formData.confidence || '?'} / 10
                  </span>
                </div>
              </div>

              {/* Terms Confusing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Do financial terms ever feel confusing or overwhelming? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="termsConfusing"
                      value="yes"
                      checked={formData.termsConfusing === 'yes'}
                      onChange={(e) => handleChange('termsConfusing', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="termsConfusing"
                      value="no"
                      checked={formData.termsConfusing === 'no'}
                      onChange={(e) => handleChange('termsConfusing', e.target.value)}
                      required
                      className="mr-2"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Helpful Explanations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What kind of explanations help you understand financial concepts better? <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select all that apply:</p>
                <div className="space-y-2">
                  {explanationOptions.map(option => (
                    <label key={option} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer bg-white dark:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.helpfulExplanations.includes(option)}
                        onChange={() => handleCheckboxChange(option)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">{option}</span>
                    </label>
                  ))}
                </div>
                {formData.helpfulExplanations.length === 0 && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">Please select at least one option</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Survey'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Survey;

