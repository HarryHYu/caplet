import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
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

                <div className="w-full max-w-lg animate-slide-up">
                    <RegisterForm
                        onSuccess={() => navigate('/courses')}
                        onSwitchToLogin={() => navigate('/login')}
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
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-brand/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-2000"></div>
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
                            Join the new <br />
                            <span className="text-zinc-500">standard.</span>
                        </h1>
                        <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-md ml-auto">
                            Create your institutional capability profile. Access structured learning modules, financial tools, and real-time progress tracking.
                        </p>
                    </div>
                </div>

                {/* Capabilities */}
                <div className="relative z-10 border-t border-white/10 pt-8 mt-auto">
                    <div className="grid grid-cols-2 gap-8 text-right">
                        <div className="col-start-2">
                            <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Student Access</h3>
                            <p className="text-zinc-500 text-xs font-medium">Full curriculum, progress tracking, interactive quizzes.</p>
                        </div>
                        <div>
                            {/* Empty or another stat */}
                        </div>
                        <div className="col-start-2 col-span-1">
                            <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Faculty Access</h3>
                            <p className="text-zinc-500 text-xs font-medium">Class management, assignment distribution, analytics.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
