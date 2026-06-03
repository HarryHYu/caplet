import { useNavigate, Link, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || '/dashboard';

  return (
    <div className="min-h-screen bg-surface-body px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-2xl shadow-text-primary/10 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative flex w-full items-center justify-center px-5 py-20 sm:px-10 lg:px-16">
          <div className="absolute left-6 top-6 sm:left-10 sm:top-10">
            <Link to="/" className="group inline-flex items-center gap-3 rounded-full bg-surface-soft/70 px-4 py-2 text-sm font-serif italic text-text-primary transition-colors hover:text-accent focus:outline-none focus:ring-4 focus:ring-accent/15">
              Caplet
            </Link>
          </div>

          <div className="w-full max-w-xl rounded-[2rem] border border-line-soft bg-white/90 p-6 shadow-xl shadow-text-primary/5 backdrop-blur sm:p-8 lg:p-10">
            <LoginForm
              onSuccess={() => navigate(redirectPath, { replace: true })}
              onSwitchToRegister={() => navigate('/register')}
              isPage
            />
            <div className="mt-10 border-t border-line-soft pt-6 text-center">
              <Link to="/" className="text-sm font-semibold text-text-dim transition-colors hover:text-accent focus:outline-none focus:ring-4 focus:ring-accent/15">
                ← Back to home
              </Link>
            </div>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-surface-soft px-12 py-16 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 left-10 h-80 w-80 rounded-full bg-white/70 blur-3xl" aria-hidden="true" />

          <div className="relative z-10">
            <span className="section-kicker">Your learning dashboard</span>
            <h1 className="mt-6 max-w-xl text-6xl font-bold leading-[0.95] tracking-tight text-text-primary xl:text-7xl">
              Keep building your{' '}
              <span className="font-serif italic text-accent-strong">financial confidence.</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-text-muted">
              Sign in to return to clear lessons, practical money tools, and progress that stays with you.
            </p>
          </div>

          <div className="relative z-10 rounded-[2rem] border border-white/70 bg-white/60 p-8 shadow-xl shadow-text-primary/5 backdrop-blur">
            <p className="text-2xl font-serif italic leading-snug text-text-primary">
              “A calm place to learn money basics without jargon or pressure.”
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">Lessons</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">Clear</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">Tools</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">Practical</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">Pace</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">Yours</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Login;
