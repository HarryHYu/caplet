import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

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
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading classes…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {/* Header Section */}
        <header className="mb-32 flex flex-col md:flex-row md:items-end justify-between gap-12 reveal-text">
          <div>
            <span className="section-kicker">Faculty Admissions</span>
            <h1 className="text-6xl md:text-8xl mb-12">
              The Academy.
            </h1>
            <p className="text-2xl text-text-muted font-serif italic max-w-xl leading-relaxed">
              Collaborative learning environments structured for peer progression and academic leadership.
            </p>
          </div>
          <div className="flex gap-4">
            {isTeacher && (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary px-12 py-5 text-[10px]"
              >
                Establish Class
              </button>
            )}
            <button
              onClick={() => {
                if (!isAuthenticated) return navigate('/login');
                setShowJoin(true);
              }}
              className={`${isTeacher ? 'btn-secondary' : 'btn-primary'} px-12 py-5 text-[10px]`}
            >
              Join Class
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-20 p-10 bg-red-50 text-red-800 text-[10px] font-bold uppercase tracking-widest border border-red-100 flex items-center gap-4 reveal-text">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Signal Error: {error}
          </div>
        )}

        {isTeacher && (
          <section className="mb-32 reveal-text stagger-1">
            <h2 className="text-[11px] font-bold text-accent uppercase tracking-[0.5em] mb-12 border-b border-line-soft pb-6">
              Leadership Portfolio
            </h2>
            {classes.teaching.length === 0 ? (
              <div className="p-24 border border-line-soft text-center bg-surface-soft">
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                  No managed entities detected.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line-soft border border-line-soft">
                {classes.teaching.map((cls) => (
                  <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-body p-12 group transition-all duration-700 hover:bg-surface-raised flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-12">
                        <h3 className="text-3xl font-serif italic group-hover:translate-x-2 transition-transform duration-700">{cls.name}</h3>
                        <span className="text-[9px] font-bold px-3 py-1 bg-text-primary text-surface-body uppercase tracking-widest group-hover:bg-accent transition-colors">Owner</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-12 border-t border-line-soft">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Passkey Protocol:</span>
                      <span className="text-xs font-bold font-mono tracking-widest text-text-primary group-hover:text-accent transition-colors">
                        {cls.code}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="reveal-text stagger-2">
          <h2 className="text-[11px] font-bold text-accent uppercase tracking-[0.5em] mb-12 border-b border-line-soft pb-6">
            Enrollment Registry
          </h2>
          {classes.student.length === 0 ? (
            <div className="p-24 border border-line-soft text-center bg-surface-soft">
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest italic">
                Awaiting first academy registration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line-soft border border-line-soft">
              {classes.student.map((cls) => (
                <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-body p-12 group transition-all duration-700 hover:bg-surface-raised flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-12">
                      <h3 className="text-3xl font-serif italic group-hover:translate-x-2 transition-transform duration-700">{cls.name}</h3>
                      <span className="text-[9px] font-bold px-3 py-1 bg-surface-soft text-text-dim uppercase tracking-widest group-hover:text-accent group-hover:text-white transition-colors">Member</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-12 border-t border-line-soft">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Academy ID:</span>
                    <span className="text-xs font-bold font-mono tracking-widest text-text-primary group-hover:text-accent transition-colors">
                      {cls.code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Modals */}
        {showCreate && (
          <div className="fixed inset-0 bg-surface-body/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6 reveal-text">
            <div className="bg-surface-raised border border-line-soft max-w-lg w-full p-16 shadow-2xl">
              <div className="flex items-center justify-between mb-16">
                <h2 className="text-4xl font-serif italic uppercase tracking-tight">Create Entity.</h2>
                <button onClick={() => setShowCreate(false)} className="text-text-dim hover:text-accent transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-12">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-dim mb-4 block">Entity Title</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-surface-soft border border-line-soft px-8 py-5 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-dim mb-4 block">Definition (Optional)</label>
                  <textarea
                    rows={4}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full bg-surface-soft border border-line-soft px-8 py-5 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-5 text-[10px]">Abort</button>
                  <button type="submit" className="btn-primary py-5 text-[10px]">{submitting ? 'Initializing...' : 'Establish Class'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoin && (
          <div className="fixed inset-0 bg-surface-body/95 backdrop-blur-3xl flex items-center justify-center z-50 p-6 reveal-text">
            <div className="bg-surface-raised border border-line-soft max-w-sm w-full p-16 shadow-2xl">
              <div className="flex items-center justify-between mb-16">
                <h2 className="text-4xl font-serif italic uppercase tracking-tight">Access.</h2>
                <button onClick={() => setShowJoin(false)} className="text-text-dim hover:text-accent transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleJoin} className="space-y-20">
                <div className="text-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-dim mb-8 block font-serif italic">Identity Protocol Required</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-transparent text-center text-5xl font-extrabold tracking-[0.4em] outline-none border-b-2 border-line-soft focus:border-accent py-8 uppercase transition-all"
                    placeholder="PROTOCOL"
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-6 text-[10px]">{submitting ? 'Verifying...' : 'Authenticate Access'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classes;
