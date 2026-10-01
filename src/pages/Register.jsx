import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-surface-body">

      {/* Left — Brand Panel (same accent panel as Login, so the two doors match) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative bg-accent overflow-hidden flex-col">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[42vw] h-[42vw] max-w-[560px] max-h-[560px] rounded-full bg-accent-contrast/10 blur-[120px] pointer-events-none" />

        {/* Wordmark */}
        <div className="relative z-10 p-12 xl:p-16">
          <Link to="/" className="group inline-flex items-center focus-ring rounded-md">
            <span className="font-display font-extrabold tracking-[-0.02em] text-2xl text-accent-contrast group-hover:opacity-80 transition-opacity duration-200">
              Caplet
            </span>
          </Link>
        </div>

        {/* Vertically centered headline */}
        <div className="relative z-10 flex-1 flex items-center px-12 xl:px-20 pb-40">
          <div className="max-w-lg animate-rise-slow">
            <span className="mb-6 font-hand text-2xl text-accent-contrast/90 -rotate-2 inline-block">
              free, and made for students
            </span>
            <h2 className="text-6xl xl:text-7xl font-display font-extrabold text-accent-contrast leading-[0.95] tracking-tight mb-6">
              Start with<br />
              one subject.
            </h2>
            <p className="text-accent-contrast/90 text-xl leading-relaxed">
              Keep your subjects, notes, practice, study plan and upcoming assessments together — so you always know what to do next.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col relative">

        {/* Top bar: mobile wordmark + back to home */}
        <div className="flex items-center justify-between px-8 lg:px-16 xl:px-24 pt-10">
          <Link to="/" className="lg:hidden font-display font-extrabold tracking-[-0.02em] text-xl text-text-primary hover:text-accent transition-colors focus-ring rounded-md">
            Caplet
          </Link>
          <Link to="/" className="ml-auto text-sm font-bold text-text-muted hover:text-accent transition-colors focus-ring rounded-md">
            Back to home
          </Link>
        </div>

        {/* Form centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 xl:px-24 py-12">
          <div className="w-full max-w-sm animate-rise">
            <RegisterForm
              onSuccess={() => navigate('/dashboard', { replace: true })}
              onSwitchToLogin={() => navigate('/login')}
            />
          </div>
        </div>

      </div>

    </div>
  );
};

export default Register;
