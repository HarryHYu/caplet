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
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Syncing Class Vectors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 font-sans">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-20">
          <div className="animate-slide-up">
            <span className="section-kicker mb-4">Institutional Layer</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
              Class <br />Terminals.
            </h1>
            <p className="max-w-md text-xs font-bold text-zinc-400 uppercase tracking-widest mt-6 leading-relaxed">
              Synchronous group learning sequences. Connect with instructors and peer networks.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {isTeacher && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all shadow-sm"
              >
                Initialize Class
              </button>
            )}
            {!isTeacher && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    alert('Sign in to join a class with a code.');
                    return;
                  }
                  setShowJoin(true);
                }}
                className="px-8 py-4 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                Access with Code
              </button>
            )}
            {isTeacher && (
              <span className="px-6 py-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800">
                Teachers: ask the class owner to add you.
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-12 p-8 border-l-2 border-brand bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white text-[10px] font-bold uppercase tracking-widest animate-fade-in flex items-center gap-4">
            <span className="text-brand">●</span>
            System Conflict: {error}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-10 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-[0.2em] px-6 py-4">
            Sign in to create and join classes. You can still review how the class system works without an account.
          </div>
        )}

        {isTeacher && (
          <section className="mb-20 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-10 border-b border-zinc-100 dark:border-zinc-900 pb-4">
              Leader Portals
            </h2>
            {classes.teaching.length === 0 ? (
              <div className="p-16 border border-zinc-100 dark:border-zinc-900 text-center bg-zinc-50 dark:bg-zinc-950">
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Zero active teaching sequences detected.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {classes.teaching.map((cls) => (
                  <Link
                    key={cls.id}
                    to={`/classes/${cls.id}`}
                    className="mesh-card p-10 group"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter group-hover:text-brand transition-colors">
                        {cls.name}
                      </h3>
                      <span className="text-[9px] font-bold px-3 py-1 bg-brand text-white uppercase tracking-widest">
                        Leader
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-zinc-400">Class Key:</span>
                      <span className="text-black dark:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-sm font-mono group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all">
                        {cls.code}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-10 border-b border-zinc-100 dark:border-zinc-900 pb-4">
            Participant Streams
          </h2>
          {classes.student.length === 0 ? (
            <div className="p-16 border border-zinc-100 dark:border-zinc-900 text-center bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                Zero participant memberships found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {classes.student.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/classes/${cls.id}`}
                  className="mesh-card p-10 group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter group-hover:text-brand transition-colors">
                      {cls.name}
                    </h3>
                    <span className="text-[9px] font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Participant
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-400">Access Vector:</span>
                    <span className="text-black dark:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-sm font-mono group-hover:bg-brand group-hover:text-white transition-all">
                      {cls.code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Create class modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-6">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 max-w-lg w-full p-12 shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  New Sequence.
                </h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[9px] font-bold italic uppercase tracking-widest text-zinc-500">
                    Class Title
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-[0.1em] focus:border-brand outline-none"
                    placeholder="E.G. LEVEL 1 TRADING TERMINAL..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[9px] font-bold italic uppercase tracking-widest text-zinc-500">
                    Operational Scope (Optional)
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-5 py-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-black dark:text-white font-bold text-xs uppercase tracking-[0.1em] focus:border-brand outline-none resize-none"
                    placeholder="DEFINE OBJECTIVES..."
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-8 py-4 border border-zinc-100 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    disabled={submitting}
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all shadow-sm"
                  >
                    {submitting ? 'Initializing...' : 'Execute'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join class modal */}
        {showJoin && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 max-w-sm w-full p-12 shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Join Unit.
                </h2>
                <button
                  onClick={() => setShowJoin(false)}
                  className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleJoin} className="space-y-10">
                <div className="space-y-4 text-center">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
                    Enter Verification Key
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    maxLength={10}
                    placeholder="ABC123"
                    className="w-full bg-transparent text-center text-4xl font-extrabold text-black dark:text-white tracking-[0.3em] outline-none border-b-2 border-zinc-100 dark:border-zinc-900 focus:border-brand py-6 uppercase transition-all"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-8 py-5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all"
                  >
                    {submitting ? 'Linking...' : 'Establish Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoin(false)}
                    className="w-full py-4 text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Discard Protocol
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

