import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-surface-body">

      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative bg-surface-inverse overflow-hidden flex-col">
        <div className="absolute top-[24%] left-[10%] w-[38vw] h-[38vw] max-w-[480px] max-h-[480px] rounded-full bg-accent/40 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[8%] w-[24vw] h-[24vw] max-w-[320px] max-h-[320px] rounded-full bg-[color:var(--mark-amber)]/25 blur-[110px] pointer-events-none" />

        {/* Wordmark */}
        <div className="relative z-10 p-12 xl:p-16">
          <Link to="/" className="group inline-flex items-center">
            <span className="font-bricolage font-extrabold tracking-[-0.02em] text-xl text-text-contrast group-hover:text-accent transition-colors duration-200">
              Caplet.
            </span>
          </Link>
        </div>

        {/* Vertically centered headline */}
        <div className="relative z-10 flex-1 flex items-center px-12 xl:px-20 pb-40">
          <div className="max-w-lg">
            <span className="font-hand text-2xl text-accent mb-6 block -rotate-2">
              free, open, and a little playful
            </span>
            <h2 className="text-6xl xl:text-7xl font-display font-extrabold text-text-contrast leading-[0.95] tracking-tight mb-6">
              Start building,<br />
              <span className="text-accent">learn for life.</span>
            </h2>
            <p className="text-text-dim text-xl leading-relaxed">
              Courses, live code, graphing, quizzes, and classrooms — all free, all open-source.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col relative">

        {/* Top bar: mobile wordmark + back to home */}
        <div className="flex items-center justify-between px-8 lg:px-16 xl:px-24 pt-10">
          <Link to="/" className="lg:hidden font-bricolage font-extrabold tracking-[-0.02em] text-xl text-text-primary hover:text-accent transition-colors">
            Caplet.
          </Link>
          <Link to="/" className="ml-auto text-sm font-bold text-text-dim hover:text-accent transition-colors">
            Back to home
          </Link>
        </div>

        {/* Form centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 xl:px-24 py-12">
          <div className="w-full max-w-sm">
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
