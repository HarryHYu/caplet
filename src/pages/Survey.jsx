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
      <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto bg-surface-raised border border-line-soft p-12 lg:p-20 text-center reveal-text">
            <div className="w-20 h-20 border border-line-soft flex items-center justify-center mx-auto mb-12">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="section-kicker mb-4">Transmission Received</span>
            <h2 className="text-4xl font-black mb-8 italic">Observation Recorded.</h2>
            <p className="text-text-muted mb-12 font-serif italic leading-relaxed">
              Your empirical data has been successfully ingested into our research matrix. This insight will inform future curriculum architecture.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/survey-results" className="btn-primary text-xs uppercase tracking-widest px-10 py-4">
                View Global Matrix
              </Link>
              <Link to={isAuthenticated ? '/courses' : '/'} className="btn-secondary text-xs uppercase tracking-widest px-10 py-4">
                {isAuthenticated ? 'Return to Academy' : 'Return Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-24 reveal-text max-w-4xl mx-auto">
          <span className="section-kicker">Observatory &rarr; Literacy</span>
          <h1 className="text-6xl md:text-8xl mb-8">
            Diagnostic <br />Analysis.
          </h1>
          <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-xl">
            Contribute to our ongoing research into economic literacy and pedagogical optimization. All transmissions are anonymized.
          </p>
          <div className="h-px w-full bg-line-soft mt-12" />
        </header>

        <div className="max-w-2xl mx-auto reveal-text stagger-1">
          <div className="bg-surface-body border border-line-soft p-12 lg:p-16">
            {error && (
              <div className="mb-12 p-6 bg-accent/5 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-20">
              {/* Age */}
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                  Chronological Bracket <span className="text-accent">*</span>
                </label>
                <div className="relative border-b border-line-soft focus-within:border-accent transition-colors">
                  <select
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    required
                    className="w-full bg-transparent py-4 text-xl font-bold text-text-primary outline-none appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-surface-body">Select age range</option>
                    {ageOptions.map(age => (
                      <option key={age} value={age} className="bg-surface-body">{age}</option>
                    ))}
                  </select>
                  <div className="absolute right-0 bottom-6 pointer-events-none opacity-40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Track Spending */}
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                  Capital Tracking Habits <span className="text-accent">*</span>
                </label>
                <div className="flex gap-12">
                  {['yes', 'no'].map((val) => (
                    <label key={val} className="group flex items-center gap-4 cursor-pointer">
                      <div className="relative w-6 h-6 border border-line-soft group-hover:border-accent flex items-center justify-center transition-colors">
                        {formData.tracksSpending === val && <div className="w-2 h-2 bg-accent" />}
                        <input
                          type="radio"
                          name="tracksSpending"
                          value={val}
                          checked={formData.tracksSpending === val}
                          onChange={(e) => handleChange('tracksSpending', e.target.value)}
                          required
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-text-primary">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Taught at School */}
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                  Formal Institutional Introduction <span className="text-accent">*</span>
                </label>
                <div className="flex gap-12">
                  {['yes', 'no'].map((val) => (
                    <label key={val} className="group flex items-center gap-4 cursor-pointer">
                      <div className="relative w-6 h-6 border border-line-soft group-hover:border-accent flex items-center justify-center transition-colors">
                        {formData.taughtAtSchool === val && <div className="w-2 h-2 bg-accent" />}
                        <input
                          type="radio"
                          name="taughtAtSchool"
                          value={val}
                          checked={formData.taughtAtSchool === val}
                          onChange={(e) => handleChange('taughtAtSchool', e.target.value)}
                          required
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-text-primary">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Confidence Level */}
              <div className="space-y-10">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                    Perceived Competency Index <span className="text-accent">*</span>
                  </label>
                  <span className="text-4xl font-black text-accent">{formData.confidence || '00'}</span>
                </div>
                <div className="relative pt-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.confidence}
                    onChange={(e) => handleChange('confidence', e.target.value)}
                    required
                    className="w-full h-px bg-line-soft appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between mt-4 text-[9px] font-bold text-text-muted uppercase tracking-widest">
                    <span>Baseline</span>
                    <span>Advanced</span>
                  </div>
                </div>
              </div>

              {/* Terms Confusing */}
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                  Semantic Overload <span className="text-accent">*</span>
                </label>
                <div className="flex gap-12">
                  {['yes', 'no'].map((val) => (
                    <label key={val} className="group flex items-center gap-4 cursor-pointer">
                      <div className="relative w-6 h-6 border border-line-soft group-hover:border-accent flex items-center justify-center transition-colors">
                        {formData.termsConfusing === val && <div className="w-2 h-2 bg-accent" />}
                        <input
                          type="radio"
                          name="termsConfusing"
                          value={val}
                          checked={formData.termsConfusing === val}
                          onChange={(e) => handleChange('termsConfusing', e.target.value)}
                          required
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-text-primary">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Helpful Explanations */}
              <div className="space-y-8">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim block italic">
                  Preferred Pedagogical Mediums <span className="text-accent">*</span>
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {explanationOptions.map(option => (
                    <label key={option} className="group flex items-center justify-between p-5 border border-line-soft hover:border-accent transition-colors cursor-pointer bg-surface-raised">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary">{option}</span>
                      <div className="relative w-5 h-5 border border-line-soft group-hover:border-accent flex items-center justify-center transition-colors">
                        {formData.helpfulExplanations.includes(option) && <div className="w-2 h-2 bg-accent" />}
                        <input
                          type="checkbox"
                          checked={formData.helpfulExplanations.includes(option)}
                          onChange={() => handleCheckboxChange(option)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-12">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-6 text-xs uppercase tracking-[0.4em] disabled:opacity-30 disabled:grayscale"
                >
                  {loading ? 'Transmitting Data...' : 'Submit Diagnostic'}
                </button>
                <p className="text-center mt-8 text-[9px] font-serif italic text-text-dim">
                  In submission, you agree to anonymous data contribution for pedagogical enhancement.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Survey;

