import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useReveal();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.getPublicProfile(userId);
        if (!cancelled && res?.user) setProfile(res.user);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Verification module offline');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, navigate]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-body p-8">
        <CapletLoader message="Loading profile" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-body">
        <div className="max-w-md w-full block-amber rounded-3xl p-12 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <span className="font-hand text-accent text-lg block mb-3">Hmm.</span>
          <p className="text-xl font-display font-extrabold tracking-tight text-text-primary mb-8">
            {error || 'We could not find that profile.'}
          </p>
          <Link to="/courses" className="btn-primary inline-block">Back to Courses</Link>
        </div>
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? 'Admin' : profile.role === 'instructor' ? 'Instructor' : 'Learner';
  const initials = [profile.firstName, profile.lastName]
    .map((s) => (s || '').charAt(0))
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto reveal">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-sm font-bold text-text-dim hover:text-accent hover:-translate-y-0.5 transition-all mb-12"
          >
            ← Back
          </button>

          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-12">
              <div className="w-24 h-24 rounded-2xl bg-accent text-white flex items-center justify-center text-4xl font-display font-extrabold tracking-tight shadow-[0_18px_36px_-22px_rgba(19,81,170,0.7)]">
                {initials}
              </div>
              <div>
                <span className="font-hand text-accent text-lg block mb-1">Say hello</span>
                <h1 className="text-5xl font-display font-extrabold tracking-tight text-text-primary mb-3">
                  {profile.firstName} {profile.lastName}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-accent block-blue rounded-xl px-3 py-1">
                    {roleLabel}
                  </span>
                  <span className="text-xs font-mono text-text-dim">ID {userId.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.bio && (
                <div className="col-span-full block-cream rounded-2xl p-7">
                  <span className="text-sm font-bold text-text-dim block mb-3">About</span>
                  <p className="text-base text-text-muted leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              <div className="col-span-full block-blue rounded-2xl p-7">
                <span className="text-sm font-bold text-text-dim block mb-2">Why you can see this profile</span>
                <p className="text-sm font-semibold leading-relaxed text-text-primary">
                  {profile.visibility === 'self' || profile.visibility === 'admin'
                    ? 'This is an account you are allowed to manage.'
                    : 'You currently share a Caplet class. Learner profile details are minimised for privacy.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default UserProfile;
