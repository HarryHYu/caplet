import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex text-black dark:text-white font-sans selection:bg-brand selection:text-white">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-zinc-50 dark:bg-black relative">
                <div className="absolute top-6 left-6 lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-black dark:bg-white rounded-sm p-1">
                            <img src="/logo.png" alt="Caplet" className="w-full h-full object-contain invert dark:invert-0" />
                        </div>
                        <span className="font-bold text-lg tracking-tighter uppercase">Caplet</span>
                    </div>
                </div>

                <div className="w-full max-w-md animate-slide-up">
                    <LoginForm
                        onSuccess={() => navigate('/courses')}
                        onSwitchToRegister={() => navigate('/register')}
                        isPage={true}
                    />
                    <div className="mt-8 text-center">
                        <a href="/" className="text-xs font-bold text-zinc-400 hover:text-black dark:hover:text-white uppercase tracking-widest transition-colors">
                            ← Back to Home
                        </a>
                    </div>
                </div>
            </div>

            {/* Right Side - Brand & Aesthetic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden flex-col justify-between p-12 md:p-16 lg:p-20">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-brand/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
                    <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-4000"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 antialiased text-right">
                    <div className="flex items-center justify-end gap-3 mb-10">
                        <span className="text-2xl font-extrabold tracking-tighter text-white uppercase">
                            Caplet
                        </span>
                        <div className="bg-white p-2 rounded-sm border border-white/10 shadow-xl">
                            <img src="/logo.png" alt="Caplet" className="h-8 w-8 object-contain" />
                        </div>
                    </div>

                    <div className="max-w-xl ml-auto">
                        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-[0.95] mb-8">
                            Financial logic <br />
                            <span className="text-zinc-500">for the modern era.</span>
                        </h1>
                        <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-md ml-auto">
                            Access your institutional terminal to manage curriculum, track student progress, and analyze financial literacy data.
                        </p>
                    </div>
                </div>

                {/* Footer/Stat */}
                <div className="relative z-10 border-t border-white/10 pt-8 mt-auto">
                    <div className="flex items-center justify-end gap-10">
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">System Status</p>
                            <div className="flex items-center justify-end gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Operational</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Version</p>
                            <span className="text-sm font-bold text-white uppercase tracking-wider">v2.4.0-stable</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
