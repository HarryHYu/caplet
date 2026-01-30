import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Classes = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState({ teaching: [], student: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getClasses();
        setClasses(data);
      } catch (e) {
        console.error('Error loading classes:', e);
        setError(e.message || 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="card-fun text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-2xl font-bold heading-gradient mb-4">
            Sign in to view classes
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create or join classroom-style groups to use Caplet lessons with your class.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === 'instructor' || user?.role === 'admin';

  const refreshClasses = async () => {
    const data = await api.getClasses();
    setClasses(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.createClass({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
      });
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      await refreshClasses();
    } catch (err) {
      console.error('Create class error:', err);
      setError(err.message || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.joinClass(joinCode.trim());
      setShowJoin(false);
      setJoinCode('');
      await refreshClasses();
      navigate(`/classes/${res.classroom.id}`);
    } catch (err) {
      console.error('Join class error:', err);
      setError(err.message || 'Failed to join class');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 mx-auto rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold heading-gradient">Classes</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Use Caplet lessons in a classroom setting, similar to Google Classroom or Khan Academy.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isTeacher && (
              <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105">➕ Create class</button>
            )}
            <button onClick={() => setShowJoin(true)} className="px-5 py-2.5 btn-secondary text-sm">Join with code</button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border-2 border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 text-red-800 dark:text-red-200 font-medium shadow-lg">⚠️ {error}</div>
        )}

        {isTeacher && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Classes you teach
            </h2>
            {classes.teaching.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You’re not teaching any classes yet. Create one to get started.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.teaching.map((cls) => (
                  <Link
                    key={cls.id}
                    to={`/classes/${cls.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        Teacher
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Class code: <span className="font-mono font-semibold">{cls.code}</span>
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Classes you’re in
          </h2>
          {classes.student.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You’re not in any classes yet. Ask your teacher for a class code to join.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.student.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/classes/${cls.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {cls.name}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      Student
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Class code: <span className="font-mono font-semibold">{cls.code}</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Create class modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold heading-gradient">✨ Create class</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Class name</label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} required className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Description (optional)</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 resize-none transition-all" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all" disabled={submitting}>Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 shadow-lg disabled:opacity-50 transition-all hover:scale-105">
                    {submitting ? '⏳ Creating...' : '✨ Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join class modal */}
        {showJoin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold heading-gradient">🔗 Join class</h2>
                <button onClick={() => setShowJoin(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Class code</label>
                  <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required placeholder="E.g. ABC123" className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowJoin(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all" disabled={submitting}>Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 shadow-lg disabled:opacity-50 transition-all hover:scale-105">
                    {submitting ? '⏳ Joining...' : '✨ Join'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classes;

