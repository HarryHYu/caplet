import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-6" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim animate-pulse">Syncing Registry...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-body">
        <div className="max-w-md w-full border border-red-500/30 p-12 bg-red-50/10 text-center reveal-text">
          <span className="section-kicker !text-red-500 mb-6">Protocol Error</span>
          <p className="text-xl font-serif italic text-text-primary mb-8">
            {error || 'Identity not found.'}
          </p>
          <Link to="/courses" className="btn-primary py-4 px-10 inline-block">Return to Catalog</Link>
        </div>
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? 'Strategic Admin' : profile.role === 'instructor' ? 'Lead Architect' : 'Scholar Portfolio';
  const initials = [profile.firstName, profile.lastName]
    .map((s) => (s || '').charAt(0))
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto reveal-text">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-text-dim hover:text-accent transition-colors mb-12"
          >
            ← [ TERMINATE_VIEW ]
          </button>

          <div className="relative border border-line-soft bg-surface-raised p-12 lg:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] grid-technical !bg-[size:40px_40px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-16 pb-16 border-b border-line-soft">
                <div className="w-24 h-24 border border-line-soft bg-surface-body flex items-center justify-center text-4xl font-serif italic text-accent shadow-premium">
                  {initials}
                </div>
                <div>
                  <span className="section-kicker !text-accent mb-4">Registry Node</span>
                  <h1 className="text-5xl font-serif italic text-text-primary mb-2">
                    {profile.firstName} {profile.lastName}.
                  </h1>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] px-3 py-1 border border-line-soft">
                      {roleLabel}
                    </span>
                    <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">UUID: {userId.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {profile.bio && (
                  <div className="col-span-full mb-8">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim block mb-6">Professional Dossier</span>
                    <p className="text-base text-text-muted font-serif italic leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim block mb-4">System Access</span>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Active Status</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-line-soft" />
                      <span className="text-xs font-bold text-text-dim uppercase tracking-widest">Two-Factor Enabled</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim block mb-4">Verification Level</span>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-serif italic text-text-primary">Mastery Tier 01</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-accent uppercase tracking-widest underline decoration-accent/20 cursor-pointer">View Credentials →</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-10 border-t border-line-soft flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-dim mb-1">Last Synchronized</p>
                  <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">FEB 18, 2026 - 06:42 GMT</span>
                </div>
                <div className="text-right">
                  <button className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim hover:text-accent transition-colors">
                    Request Data Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default UserProfile;
