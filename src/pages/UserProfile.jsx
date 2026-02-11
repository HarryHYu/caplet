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
        if (!cancelled) setError(e.message || 'Could not load profile');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error || 'User not found'}</p>
          <Link to="/courses" className="text-blue-600 dark:text-blue-400 hover:underline">Back to Courses</Link>
        </div>
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? 'Admin' : profile.role === 'instructor' ? 'Teacher' : 'Student';
  const initials = [profile.firstName, profile.lastName]
    .map((s) => (s || '').charAt(0))
    .join('')
    .toUpperCase() || '?';
  const colors = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-emerald-400 to-emerald-600',
  ];
  const colorIndex = (profile.firstName + profile.lastName).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
        >
          ← Back
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white text-xl font-bold shadow-lg`}
              >
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {profile.firstName} {profile.lastName}
                </h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">{roleLabel}</span>
              </div>
            </div>
            {profile.bio && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
