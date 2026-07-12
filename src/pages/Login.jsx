import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const redirectPath = location.state?.from || '/dashboard';
    const sessionExpired = searchParams.get('reason') === 'session_expired';

    return (
        <div className="min-h-screen flex bg-surface-body">

            {/* Left — Brand Panel */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative bg-accent overflow-hidden flex-col">
                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[42vw] h-[42vw] max-w-[560px] max-h-[560px] rounded-full bg-white/10 blur-[120px] pointer-events-none" />

                {/* Wordmark */}
                <div className="relative z-10 p-12 xl:p-16">
                    <Link to="/" className="group inline-flex items-center">
                        <span className="font-bricolage font-extrabold tracking-[-0.02em] text-2xl text-white group-hover:opacity-80 transition-opacity duration-200">
                            Caplet.
                        </span>
                    </Link>
                </div>

                {/* Vertically centered headline */}
                <div className="relative z-10 flex-1 flex items-center px-12 xl:px-20 pb-40">
                    <div className="max-w-lg">
                        <span className="font-hand text-2xl text-white/90 mb-6 block -rotate-2">
                            Welcome back
                        </span>
                        <h2 className="text-6xl xl:text-7xl font-display font-extrabold text-white leading-[0.95] tracking-tight mb-6">
                            Good to<br />
                            see you again.
                        </h2>
                        <p className="text-white/80 text-xl leading-relaxed">
                            Pick up your courses, classes, and tools right where you left off.
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
                        {sessionExpired && (
                            <div className="mb-6 px-4 py-3 block-amber rounded-xl text-amber font-medium text-sm shadow-[0_18px_40px_-30px_rgba(20,20,18,0.4)]">
                                Your session expired. Please log in again to continue.
                            </div>
                        )}
                        <LoginForm
                            onSuccess={() => navigate(redirectPath, { replace: true, state: location.state?.returnState })}
                            onSwitchToRegister={() => navigate('/register')}
                        />
                    </div>
                </div>

            </div>

        </div>
    );
};

export default Login;
