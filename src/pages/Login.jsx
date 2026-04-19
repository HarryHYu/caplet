import { useNavigate, Link, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const redirectPath = location.state?.from || '/dashboard';

    return (
        <div className="min-h-screen flex bg-caplet-parchment">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden bg-white">

                <div className="absolute top-12 left-12 reveal-text">
                    <Link to="/" className="flex items-center gap-3 group">
                        <span className="text-sm font-serif italic text-caplet-ink group-hover:text-caplet-sky transition-colors">
                            Caplet
                        </span>
                    </Link>
                </div>

                <div className="w-full max-w-sm relative z-10">
                    <LoginForm
                        onSuccess={() => navigate(redirectPath, { replace: true })}
                        onSwitchToRegister={() => navigate('/register')}
                        isPage={true}
                    />
                    <div className="mt-12 text-center lg:text-left reveal-text stagger-2">
                        <Link to="/" className="text-sm font-medium text-caplet-ink/40 hover:text-caplet-sky transition-colors">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Brand & Aesthetic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-caplet-sand overflow-hidden flex-col justify-center p-24">
                <div className="relative z-10">
                    <div className="max-w-xl">
                        <span className="text-sm font-display font-bold text-caplet-sky mb-6 block uppercase tracking-widest">Our Mission</span>
                        <h1 className="text-6xl xl:text-7xl text-caplet-ink font-bold leading-tight mb-12">
                            Mastering your <br />
                            <span className="italic font-serif text-caplet-ocean">financial future.</span>
                        </h1>
                        <div className="p-10 bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-xl shadow-caplet-ink/5">
                            <p className="text-3xl font-serif italic text-caplet-ink mb-4">"A friend explaining money over coffee."</p>
                            <div className="flex items-center gap-3 text-caplet-sky font-bold text-sm tracking-widest uppercase">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Login;
