/**
 * Sabotage visual effects — the eight overlays a Study Party victim sees.
 * Every effect is decoration only: it attacks the eyes, never the hands
 * (input handling and drill state are untouchable), ends on its own, and
 * respects reduced motion. `wipe` counts the words the victim has typed
 * since being hit — ink shrinks, fog squeegees and the cat gets bored as
 * it climbs.
 */
/* eslint-disable react-refresh/only-export-components -- SABOTAGE_META rides
   along with the FX components; this leaf module never hot-reloads alone. */
import { useEffect } from 'react';

export const SABOTAGE_META = {
    confetti: { label: 'Confetti Cannon', emoji: '🎉', durationMs: 4000 },
    snail: { label: 'Snail-Mo', emoji: '🐌', durationMs: 8000 },
    ink: { label: 'Ink Splat', emoji: '🦑', durationMs: 7000 },
    jelly: { label: 'Jelly Text', emoji: '🍮', durationMs: 6000 },
    fog: { label: 'Fog on the Glass', emoji: '🌫️', durationMs: 8000 },
    bomb: { label: 'Blur Bomb', emoji: '💣', durationMs: 6000 },
    cat: { label: 'Cat Deploy', emoji: '🐈', durationMs: 10000 },
    thief: { label: 'Word Thief', emoji: '🦹', durationMs: 3000 },
};

const HUES = ['#8b5cf6', '#22d3ee', '#f2c94c', '#34d399', '#60a5fa'];

const reducedMotion = () => typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** Adds a body class for the effect's lifetime (drill CSS reacts to it). */
function useBodyClass(name) {
    useEffect(() => {
        if (reducedMotion()) return undefined;
        document.body.classList.add(name);
        return () => document.body.classList.remove(name);
    }, [name]);
}

const Overlay = ({ children, style }) => (
    <div aria-hidden="true" style={style} className="pointer-events-none fixed inset-0 z-[85] overflow-hidden">
        <style>{FX_CSS}</style>
        {children}
    </div>
);

// ── 1. Confetti Cannon ──────────────────────────────────────────────────────
function ConfettiFx() {
    return (
        <Overlay>
            <div className="fx-popper fx-popper-l">🎉</div>
            <div className="fx-popper fx-popper-r">🎉</div>
            {Array.from({ length: 26 }, (_, k) => (
                <span key={k} className="fx-conf"
                    style={{
                        left: `${(k * 37) % 100}%`,
                        background: HUES[k % HUES.length],
                        animationDelay: `${(k % 7) * 0.12}s`,
                        animationDuration: `${2.2 + (k % 5) * 0.35}s`,
                    }} />
            ))}
        </Overlay>
    );
}

// ── 2. Snail-Mo ─────────────────────────────────────────────────────────────
function SnailFx() {
    useBodyClass('fx-snailmo');
    return (
        <Overlay>
            <svg className="fx-snail" viewBox="0 0 120 70" width="110" height="64">
                <path d="M14 58 q40 10 92 0 l-6 -8 q-40 8 -80 0 z" fill="#9db3a4" opacity="0.5" />
                <ellipse cx="52" cy="52" rx="34" ry="12" fill="#b7d3a8" stroke="#5f7a52" strokeWidth="3" />
                <circle cx="66" cy="34" r="22" fill="#d9a066" stroke="#8a5a34" strokeWidth="3" />
                <path d="M66 34 q10 -2 8 8 q-8 6 -12 -2 q-2 -6 4 -6" fill="none" stroke="#8a5a34" strokeWidth="3" />
                <path d="M24 48 q-4 -14 2 -20" fill="none" stroke="#5f7a52" strokeWidth="4" strokeLinecap="round" />
                <path d="M32 46 q-1 -12 5 -17" fill="none" stroke="#5f7a52" strokeWidth="4" strokeLinecap="round" />
                <circle cx="25" cy="26" r="3.4" fill="#33261a" />
                <circle cx="36" cy="27" r="3.4" fill="#33261a" />
            </svg>
            <p className="fx-slowword">sloooow…</p>
        </Overlay>
    );
}

// ── 3. Ink Splat (the Blooper) ──────────────────────────────────────────────
const INK_BLOBS = [
    { left: '14%', top: '10%', s: 1.1, d: 0 },
    { left: '58%', top: '6%', s: 1.35, d: 0.14 },
    { left: '68%', top: '46%', s: 1.0, d: 0.28 },
    { left: '8%', top: '52%', s: 1.2, d: 0.2 },
];
function InkFx({ wipe = 0 }) {
    const shrink = Math.max(0.15, 1 - wipe * 0.12);
    return (
        <Overlay>
            <svg className="fx-squid" viewBox="0 0 140 120" width="130" height="112">
                <ellipse cx="70" cy="46" rx="44" ry="38" fill="#2b2f52" stroke="#191c36" strokeWidth="4" />
                <circle cx="54" cy="42" r="13" fill="#fff" />
                <circle cx="88" cy="42" r="13" fill="#fff" />
                <circle cx="57" cy="45" r="6" fill="#191c36" />
                <circle cx="85" cy="45" r="6" fill="#191c36" />
                <path d="M60 66 q10 8 20 0" fill="none" stroke="#191c36" strokeWidth="4" strokeLinecap="round" />
                {[0, 1, 2, 3, 4].map((k) => (
                    <path key={k} d={`M${34 + k * 18} 80 q${k % 2 ? 8 : -8} 18 0 30`} fill="none" stroke="#2b2f52" strokeWidth="9" strokeLinecap="round" />
                ))}
            </svg>
            {INK_BLOBS.map((blob, k) => (
                <div key={k} className="fx-splat" style={{ left: blob.left, top: blob.top, animationDelay: `${blob.d}s`, transform: `scale(${blob.s * shrink})` }}>
                    <svg viewBox="0 0 200 170" width={280} height={238}>
                        <path fill="#181b33" opacity="0.93"
                            d="M100 12 C128 4 150 22 160 40 C186 44 196 66 184 86 C198 104 186 130 162 132 C154 156 122 166 100 154 C76 168 44 156 38 132 C12 128 4 100 20 84 C8 62 22 40 46 38 C56 18 76 18 100 12 Z" />
                        <ellipse cx="76" cy="52" rx="22" ry="10" fill="#3a3f66" opacity="0.55" />
                        <rect className="fx-drip" x="60" y="140" width="13" height="34" rx="6" fill="#181b33" opacity="0.9" />
                        <rect className="fx-drip" style={{ animationDelay: '0.5s' }} x="126" y="146" width="10" height="26" rx="5" fill="#181b33" opacity="0.85" />
                    </svg>
                </div>
            ))}
        </Overlay>
    );
}

// ── 4. Jelly Text ───────────────────────────────────────────────────────────
function JellyFx() {
    useBodyClass('fx-jelly');
    return (
        <Overlay>
            <div className="fx-jellyblob">🍮</div>
        </Overlay>
    );
}

// ── 5. Fog on the Glass ─────────────────────────────────────────────────────
function FogFx({ wipe = 0 }) {
    const cleared = Math.min(1, wipe / 6);
    return (
        <Overlay style={{ opacity: 1 - cleared }}>
            <div className="fx-fog fx-fog-top" />
            <div className="fx-fog fx-fog-bottom" />
            <div className="fx-fog fx-fog-left" />
            <div className="fx-fog fx-fog-right" />
            {Array.from({ length: Math.min(6, wipe) }, (_, k) => (
                <div key={k} className="fx-squeegee" style={{ left: `${8 + k * 15}%` }} />
            ))}
            <div className="fx-smiley">☺</div>
        </Overlay>
    );
}

// ── 6. Blur Bomb ────────────────────────────────────────────────────────────
function BombFx() {
    return (
        <Overlay>
            <div className="fx-bombfall">💣</div>
            <div className="fx-shockwave" />
            <div className="fx-blurpane" />
            {[0, 1, 2].map((k) => (
                <div key={k} className="fx-smoke" style={{ left: `${42 + k * 7}%`, animationDelay: `${0.5 + k * 0.15}s` }} />
            ))}
        </Overlay>
    );
}

// ── 7. Cat Deploy ───────────────────────────────────────────────────────────
function CatFx({ wipe = 0 }) {
    const bored = wipe >= 4;
    return (
        <Overlay>
            <div className="fx-box">📦</div>
            <div className={bored ? 'fx-cat fx-cat-leave' : 'fx-cat'}>
                <svg viewBox="0 0 140 120" width="130" height="112">
                    <path className="fx-tail" d="M112 92 q22 -8 16 -30" fill="none" stroke="#6e655c" strokeWidth="10" strokeLinecap="round" />
                    <ellipse cx="74" cy="92" rx="44" ry="26" fill="#8a8177" stroke="#544d45" strokeWidth="3" />
                    <circle cx="52" cy="52" r="26" fill="#8a8177" stroke="#544d45" strokeWidth="3" />
                    <path d="M32 36 l6 -16 12 12 z" fill="#8a8177" stroke="#544d45" strokeWidth="3" />
                    <path d="M72 36 l-6 -16 -12 12 z" fill="#8a8177" stroke="#544d45" strokeWidth="3" />
                    <ellipse className="fx-blink" cx="44" cy="52" rx="4" ry="5" fill="#2c2c1e" />
                    <ellipse className="fx-blink" cx="62" cy="52" rx="4" ry="5" fill="#2c2c1e" />
                    <path d="M48 62 q5 4 10 0" fill="none" stroke="#544d45" strokeWidth="2.4" strokeLinecap="round" />
                    <g stroke="#544d45" strokeWidth="1.6">
                        <line x1="28" y1="58" x2="10" y2="55" /><line x1="28" y1="63" x2="10" y2="64" />
                        <line x1="78" y1="58" x2="96" y2="55" /><line x1="78" y1="63" x2="96" y2="64" />
                    </g>
                </svg>
            </div>
        </Overlay>
    );
}

// ── 8. Word Thief ───────────────────────────────────────────────────────────
function ThiefFx() {
    return (
        <Overlay>
            <div className="fx-rope" />
            <div className="fx-thief">
                <svg viewBox="0 0 90 110" width="86" height="105">
                    <circle cx="45" cy="26" r="18" fill="#6d5a92" stroke="#453a60" strokeWidth="3" />
                    <rect x="29" y="18" width="32" height="9" rx="4" fill="#2c2540" />
                    <circle cx="39" cy="23" r="3" fill="#fff" />
                    <circle cx="52" cy="23" r="3" fill="#fff" />
                    <rect x="30" y="44" width="30" height="38" rx="10" fill="#6d5a92" stroke="#453a60" strokeWidth="3" />
                    <circle cx="70" cy="76" r="15" fill="#8a7a52" stroke="#5e5338" strokeWidth="3" />
                    <path d="M62 66 q8 -8 16 0" fill="none" stroke="#5e5338" strokeWidth="3" />
                </svg>
            </div>
            {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} className="fx-coin" style={{ animationDelay: `${0.6 + k * 0.12}s`, right: `${40 + k * 14}px` }}>🪙</span>
            ))}
        </Overlay>
    );
}

const FX_CSS = `
@media (prefers-reduced-motion: reduce) {
    .fx-popper, .fx-conf, .fx-snail, .fx-slowword, .fx-squid, .fx-splat, .fx-drip, .fx-jellyblob,
    .fx-fog, .fx-squeegee, .fx-smiley, .fx-bombfall, .fx-shockwave, .fx-blurpane, .fx-smoke,
    .fx-box, .fx-cat, .fx-tail, .fx-blink, .fx-rope, .fx-thief, .fx-coin { animation: none !important; }
    .fx-blurpane { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
}
.fx-popper { position: absolute; bottom: 12px; font-size: 44px; animation: fx-pop-in 0.5s ease-out both; }
.fx-popper-l { left: 18px; transform: rotate(-20deg); }
.fx-popper-r { right: 18px; transform: rotate(20deg) scaleX(-1); }
@keyframes fx-pop-in { 0% { transform: translateY(60px); } 100% { transform: translateY(0); } }
.fx-conf { position: absolute; top: -12px; width: 7px; height: 11px; border-radius: 2px; opacity: 0.9;
    animation: fx-conf-fall 2.6s ease-in both; }
@keyframes fx-conf-fall { 0% { transform: translateY(0) rotate(0); opacity: 0; } 12% { opacity: .95; }
    100% { transform: translateY(105vh) rotate(420deg); opacity: .4; } }
.fx-snail { position: absolute; bottom: 8px; left: -130px; animation: fx-snail-crawl 8s linear both; }
@keyframes fx-snail-crawl { to { transform: translateX(55vw); } }
.fx-slowword { position: absolute; bottom: 84px; left: 12%; font-style: italic; font-weight: 700;
    color: color-mix(in srgb, var(--text-primary) 55%, transparent); animation: fx-drift-up 3s ease-out infinite; }
@keyframes fx-drift-up { 0% { transform: translateY(0); opacity: 0; } 25% { opacity: .8; } 100% { transform: translateY(-26px); opacity: 0; } }
.fx-squid { position: absolute; bottom: -8px; left: 44%; animation: fx-squid-pop 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fx-squid-pop { 0% { transform: translateY(130px) scaleY(0.7); } 55% { transform: translateY(-14px) scaleY(1.06); } 100% { transform: translateY(6px) scaleY(1); } }
.fx-splat { position: absolute; animation: fx-splat-land 7s ease-out both; transition: transform 0.3s ease-out; }
@keyframes fx-splat-land { 0% { opacity: 0; } 4% { opacity: 1; } 8% { opacity: 1; } 62% { opacity: .92; } 100% { opacity: 0; } }
.fx-drip { animation: fx-drip-run 2.2s ease-in both; transform-box: fill-box; transform-origin: 50% 0%; }
@keyframes fx-drip-run { 0% { transform: scaleY(0.1); } 100% { transform: scaleY(1); } }
.fx-jellyblob { position: absolute; bottom: 16px; right: 22px; font-size: 40px; animation: fx-jelly-bob 0.7s ease-in-out infinite; }
@keyframes fx-jelly-bob { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(2px) scaleY(0.92); } }
body.fx-jelly .memorise-stream { animation: fx-jelly-wobble 1.4s ease-in-out infinite; }
@keyframes fx-jelly-wobble { 0%,100% { transform: translate(0, 0); } 25% { transform: translate(2.5px, -2px); }
    50% { transform: translate(-2px, 2.5px); } 75% { transform: translate(2px, 1.5px); } }
body.fx-snailmo .memorise-stream .animate-pop { animation-duration: 1.4s !important; }
body.fx-snailmo .memorise-stream > div { transition-duration: 900ms !important; }
.fx-fog { position: absolute; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    background: color-mix(in srgb, var(--surface-raised) 55%, transparent); animation: fx-fog-in 1.4s ease-out both; }
.fx-fog-top { inset: 0 0 72% 0; } .fx-fog-bottom { inset: 72% 0 0 0; }
.fx-fog-left { inset: 20% 72% 20% 0; } .fx-fog-right { inset: 20% 0 20% 72%; }
@keyframes fx-fog-in { 0% { opacity: 0; } 100% { opacity: 1; } }
.fx-squeegee { position: absolute; top: 0; bottom: 0; width: 9%;
    background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--surface-body) 70%, transparent), transparent);
    animation: fx-squeegee-swipe 0.5s ease-out both; }
@keyframes fx-squeegee-swipe { 0% { transform: translateY(-30%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
.fx-smiley { position: absolute; top: 9%; right: 9%; font-size: 34px; opacity: 0;
    color: color-mix(in srgb, var(--text-primary) 45%, transparent); animation: fx-smiley-draw 2s ease-out 1.2s both; }
@keyframes fx-smiley-draw { to { opacity: 0.7; } }
.fx-bombfall { position: absolute; left: 48%; top: -60px; font-size: 46px; animation: fx-bomb-drop 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
@keyframes fx-bomb-drop { 0% { transform: translateY(0); } 62% { transform: translateY(46vh) scaleY(1.05); }
    78% { transform: translateY(43vh) scaleY(0.9); } 100% { transform: translateY(45vh) scale(0); } }
.fx-shockwave { position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px;
    border: 4px solid color-mix(in srgb, var(--text-primary) 35%, transparent); border-radius: 50%;
    animation: fx-shock 1s ease-out 0.75s both; }
@keyframes fx-shock { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(9); opacity: 0; } }
.fx-blurpane { position: absolute; inset: 0; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    animation: fx-blur-in 6s ease-in-out both;
    mask-image: radial-gradient(ellipse 220px 70px at 50% 50%, transparent 0 55%, black 100%);
    -webkit-mask-image: radial-gradient(ellipse 220px 70px at 50% 50%, transparent 0 55%, black 100%); }
@keyframes fx-blur-in { 0% { opacity: 0; } 14% { opacity: 0; } 22% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
.fx-smoke { position: absolute; top: 44%; width: 46px; height: 46px; border-radius: 50%;
    background: color-mix(in srgb, var(--text-primary) 18%, transparent); filter: blur(4px);
    animation: fx-smoke-up 2.4s ease-out both; }
@keyframes fx-smoke-up { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 20% { opacity: .8; }
    100% { transform: translateY(-90px) scale(1.6); opacity: 0; } }
.fx-box { position: absolute; bottom: 24%; left: 26%; font-size: 44px; animation: fx-box-slide 0.8s ease-out both; }
@keyframes fx-box-slide { 0% { transform: translateX(-50vw); } 100% { transform: translateX(0); } }
.fx-cat { position: absolute; bottom: 26%; left: 32%; animation: fx-cat-arrive 1.6s ease-out both; }
@keyframes fx-cat-arrive { 0% { transform: translateY(30px) scale(0.7); opacity: 0; } 40% { opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; } }
.fx-cat-leave { animation: fx-cat-exit 1.4s ease-in both !important; }
@keyframes fx-cat-exit { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(60vw); opacity: 0; } }
.fx-tail { animation: fx-tail-swish 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 100%; }
@keyframes fx-tail-swish { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
.fx-blink { animation: fx-cat-blink 4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes fx-cat-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
.fx-rope { position: absolute; top: 0; right: 96px; width: 3px; height: 34%;
    background: color-mix(in srgb, var(--text-primary) 45%, transparent); animation: fx-rope-drop 0.5s ease-out both; transform-origin: top; }
@keyframes fx-rope-drop { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
.fx-thief { position: absolute; top: 34%; right: 58px; animation: fx-thief-run 3s ease-in-out both; }
@keyframes fx-thief-run { 0% { transform: translateY(-70vh); } 22% { transform: translateY(0); }
    30% { transform: translateY(0) rotate(-6deg); } 38% { transform: translateY(0) rotate(5deg); }
    46% { transform: translateY(0) rotate(-4deg); } 74% { transform: translateY(0); } 100% { transform: translateY(-70vh); } }
.fx-coin { position: absolute; top: 42%; font-size: 20px; animation: fx-coin-arc 0.9s ease-in both; }
@keyframes fx-coin-arc { 0% { transform: translate(0, 0); opacity: 1; } 55% { transform: translate(-34px, -40px); opacity: 1; }
    100% { transform: translate(-58px, 30px); opacity: 0; } }
`;

export const SABOTAGE_FX = {
    confetti: ConfettiFx,
    snail: SnailFx,
    ink: InkFx,
    jelly: JellyFx,
    fog: FogFx,
    bomb: BombFx,
    cat: CatFx,
    thief: ThiefFx,
};
