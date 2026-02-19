import { useState, useEffect } from 'react';

const CAPLET_ASCII = [
    "   ____    _    ____  _     _____ _____ ",
    "  / ___|  / \\  |  _ \\| |   | ____|_   _|",
    " | |     / _ \\ | |_) | |   |  _|   | |  ",
    " | |___ / ___ \\|  __/| |___| |___  | |  ",
    "  \\____/_/   \\_\\_|  |_____|_____| |_|  "
];

const AsciiBranding = () => {
    const [lines, setLines] = useState(Array(CAPLET_ASCII.length).fill(''));
    const [showLogo, setShowLogo] = useState(false);
    const [phase, setPhase] = useState('typing'); // typing, holding, dissolving, logo

    useEffect(() => {
        let timeout;
        let interval;

        // Phase 1: Typing
        if (phase === 'typing') {
            let charIndex = 0;
            const maxLen = CAPLET_ASCII[0].length;

            interval = setInterval(() => {
                setLines(prev => {
                    return CAPLET_ASCII.map((line, i) => {
                        // Only reveal up to charIndex
                        // We need to handle potential undefined if lines have diff lengths, though here they are consistent
                        return line.substring(0, charIndex);
                    });
                });

                charIndex++;
                if (charIndex > maxLen) {
                    clearInterval(interval);
                    setPhase('holding');
                }
            }, 50);

            return () => clearInterval(interval);
        }

        // Phase 2: Holding
        if (phase === 'holding') {
            timeout = setTimeout(() => {
                setPhase('dissolving');
            }, 2000);
            return () => clearTimeout(timeout);
        }

        // Phase 3: Dissolving
        if (phase === 'dissolving') {
            let cycles = 0;
            interval = setInterval(() => {
                setLines(prev => prev.map(line => {
                    return line.split('').map(c => {
                        if (c === ' ') return ' ';
                        return Math.random() > 0.6 ? ' ' : String.fromCharCode(33 + Math.floor(Math.random() * 90));
                    }).join('');
                }));

                cycles++;
                if (cycles > 15) {
                    clearInterval(interval);
                    setShowLogo(true);
                    setPhase('logo');
                }
            }, 80);
            return () => clearInterval(interval);
        }

        // Phase 4: Logo
        if (phase === 'logo') {
            timeout = setTimeout(() => {
                setShowLogo(false);
                setLines(Array(CAPLET_ASCII.length).fill(''));
                setPhase('typing');
            }, 5000);
            return () => clearTimeout(timeout);
        }

    }, [phase]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 relative overflow-hidden selection:bg-brand selection:text-white">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#808080 1px, transparent 1px), linear-gradient(90deg, #808080 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[320px]">

                {/* ASCII Container */}
                <div className={`transition-opacity duration-500 ${showLogo ? 'opacity-0 absolute' : 'opacity-100'}`}>
                    <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-pre text-[10px] sm:text-[12px] md:text-[14px] leading-[1.15] tracking-tighter">
                        {lines.map((line, i) => (
                            <div key={i} className="h-[1.2em]">{line}</div>
                        ))}
                    </div>
                    {phase === 'typing' && <div className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-brand animate-pulse font-bold">Initializing System...</div>}
                </div>

                {/* Logo Container */}
                <div className={`transition-all duration-1000 transform absolute ${showLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand/20 blur-[50px] rounded-full"></div>
                        <div className="relative w-32 h-32 md:w-40 md:h-40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-white dark:bg-black shadow-2xl flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
                            <img src="/logo.png" alt="Caplet Logo" className="w-full h-full object-contain invert dark:invert-0" />
                        </div>
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <h3 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter">Caplet</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 animate-pulse">
                            System Ready
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AsciiBranding;
