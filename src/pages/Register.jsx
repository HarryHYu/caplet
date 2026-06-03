import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
  const navigate = useNavigate();

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
            <RegisterForm
              onSuccess={() => navigate('/dashboard', { replace: true })}
              onSwitchToLogin={() => navigate('/login')}
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
            <span className="section-kicker">Free financial education</span>
            <h1 className="mt-6 max-w-xl text-6xl font-bold leading-[0.95] tracking-tight text-text-primary xl:text-7xl">
              Start with a stronger{' '}
              <span className="font-serif italic text-accent-strong">money foundation.</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-text-muted">
              Create an account to save your progress, revisit lessons, and keep useful calculators in reach.
            </p>
          </div>

          <div className="relative z-10 rounded-[2rem] border border-white/70 bg-white/60 p-8 shadow-xl shadow-text-primary/5 backdrop-blur">
            <p className="text-2xl font-serif italic leading-snug text-text-primary">
              “No product pitches, no confusing fine print — just approachable money learning.”
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">1</span>
                <p className="text-sm font-semibold text-text-primary">Choose lessons that match your goals.</p>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">2</span>
                <p className="text-sm font-semibold text-text-primary">Use calculators to turn concepts into action.</p>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">3</span>
                <p className="text-sm font-semibold text-text-primary">Return anytime with your progress saved.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Register;
