import { useNavigate, Link, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const redirectPath = location.state?.from || '/dashboard';

    return (
        <div className="min-h-screen flex bg-surface-body selection:bg-accent selection:text-white">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden border-r border-line-soft">
                <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:40px_40px]" />

                <div className="absolute top-12 left-12 reveal-text">
                    <Link to="/" className="flex items-center gap-3 group">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim group-hover:text-accent transition-colors">
                            Caplet Intelligence
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
                        <Link to="/" className="text-[9px] font-black text-text-muted hover:text-accent uppercase tracking-[0.4em] transition-colors">
                            ← Abort and Return Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Brand & Aesthetic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-surface-inverse overflow-hidden flex-col justify-between p-24">
                {/* Background Effects */}
                <div className="absolute inset-0 opacity-10 grid-technical !bg-[size:50px_50px]" />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-30" />

                {/* Content */}
                <div className="relative z-10 reveal-text">
                    <div className="mb-24">
                        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent opacity-80 mb-6 block">Internal Protocol</span>
                        <h1 className="text-6xl xl:text-8xl text-surface-body leading-[0.85] mb-12">
                            Mastering the <br />
                            <span className="italic font-serif">Financial Engine.</span>
                        </h1>
                        <p className="text-xl text-surface-body/60 font-serif italic max-w-md leading-relaxed">
                            Access a proprietary curriculum designed for the next generation of financial architects.
                        </p>
                    </div>

                    <div className="space-y-12">
                        <div className="p-10 border border-surface-body/10 bg-surface-body/5 backdrop-blur-sm">
                            <span className="section-kicker !text-accent opacity-100 mb-6">Current Network Status</span>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-4xl font-serif italic text-surface-body">Operational.</p>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-surface-body/40 mt-2">All Registry nodes at 100% capacity</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer/Stat */}
                <div className="relative z-10 border-t border-surface-body/10 pt-10">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-surface-body/30 mb-2">V. Identification</p>
                                <span className="text-xs font-bold text-surface-body uppercase tracking-widest">v2.8.4-ALPHA</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-surface-body/30 mb-2">Registry Latency</p>
                                <span className="text-xs font-bold text-surface-body uppercase tracking-widest">14MS / HK-1</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(0,80,255,0.8)]"></span>
                            <span className="text-[10px] font-black text-surface-body uppercase tracking-[0.4em]">Core Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Login;
