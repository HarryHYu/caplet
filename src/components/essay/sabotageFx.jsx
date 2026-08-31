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
// Dense mixed-shape rain (rectangles, ribbons, stars, dots) fired from two
// party cones in the bottom corners. Pieces glide down once and settle —
// no strobing — and the whole storm thins out as the victim types.
const CONF_COLORS = ['#8b5cf6', '#22d3ee', '#f2c94c', '#34d399', '#60a5fa', '#e8a0c8', '#e8a25e'];
const STAR_POINTS = '8,1 9.9,5.9 15.2,6.1 11,9.5 12.5,14.6 8,11.6 3.5,14.6 5,9.5 0.8,6.1 6.1,5.9';

function ConfettiPiece({ k }) {
    const color = CONF_COLORS[k % CONF_COLORS.length];
    const kind = k % 4;
    if (kind === 1) {
        return ( // wavy ribbon streamer
            <svg viewBox="0 0 12 44" width="11" height="40">
                <path d="M4 2 Q11 8 4 15 Q-3 22 4 29 Q11 36 4 42" fill="none"
                    stroke={color} strokeWidth="4.5" strokeLinecap="round" opacity="0.92" />
            </svg>
        );
    }
    if (kind === 2) {
        return ( // little star
            <svg viewBox="0 0 16 16" width="15" height="15">
                <polygon points={STAR_POINTS} fill={color} opacity="0.95" />
            </svg>
        );
    }
    if (kind === 3) {
        return <span className="fx-conf-dot" style={{ background: color }} />;
    }
    return ( // classic two-tone rectangle
        <span className="fx-conf-rect" style={{
            background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 60%, #1c1b30))`,
        }} />
    );
}

function ConfettiFx({ wipe = 0 }) {
    const fade = Math.max(0, 1 - wipe * 0.16);
    const count = Math.max(8, 46 - wipe * 6);
    return (
        <Overlay style={{ opacity: fade }}>
            {Array.from({ length: count }, (_, k) => (
                <span key={k} className={k % 2 ? 'fx-conf fx-conf-b' : 'fx-conf fx-conf-a'}
                    style={{
                        left: `${(k * 61) % 100}%`,
                        top: `${(k * 37) % 82}%`,
                        animationDelay: `${(k % 9) * 0.14}s`,
                        animationDuration: `${2.3 + (k % 6) * 0.28}s`,
                    }}>
                    <ConfettiPiece k={k} />
                </span>
            ))}
            <svg className="fx-cannon fx-cannon-l" viewBox="0 0 90 90" width="76" height="76">
                <g className="fx-cannon-burst" stroke="#f2c94c" strokeWidth="4" strokeLinecap="round">
                    <line x1="52" y1="30" x2="60" y2="14" />
                    <line x1="60" y1="42" x2="76" y2="34" />
                    <line x1="42" y1="24" x2="42" y2="8" />
                </g>
                <polygon points="10,84 46,34 72,58" fill="#8b5cf6" stroke="#5a3bab" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="24,66 52,42 64,54 38,78" fill="#f2c94c" opacity="0.85" />
                <polygon points="10,84 30,70 22,62" fill="#5a3bab" opacity="0.6" />
            </svg>
            <svg className="fx-cannon fx-cannon-r" viewBox="0 0 90 90" width="76" height="76">
                <g className="fx-cannon-burst" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round">
                    <line x1="52" y1="30" x2="60" y2="14" />
                    <line x1="60" y1="42" x2="76" y2="34" />
                    <line x1="42" y1="24" x2="42" y2="8" />
                </g>
                <polygon points="10,84 46,34 72,58" fill="#34d399" stroke="#1f8a63" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="24,66 52,42 64,54 38,78" fill="#60a5fa" opacity="0.85" />
                <polygon points="10,84 30,70 22,62" fill="#1f8a63" opacity="0.6" />
            </svg>
        </Overlay>
    );
}

// ── 2. Snail-Mo ─────────────────────────────────────────────────────────────
// A chunky, big-eyed snail inches across the bottom of the screen, laying a
// glossy slime trail behind it. Body class fx-snailmo slows the drill's own
// animations. Typing fades the whole scene out.
function SnailFx({ wipe = 0 }) {
    useBodyClass('fx-snailmo');
    const fade = Math.max(0, 1 - wipe * 0.13);
    return (
        <Overlay style={{ opacity: fade }}>
            <div className="fx-snail-trail" />
            <div className="fx-snail-rig">
                <svg className="fx-snail-body" viewBox="0 0 210 130" width="180" height="112">
                    <defs>
                        <linearGradient id="fxSnailFoot" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#cfe6b8" />
                            <stop offset="1" stopColor="#9cc27e" />
                        </linearGradient>
                        <radialGradient id="fxSnailShell" cx="0.38" cy="0.32" r="0.9">
                            <stop offset="0" stopColor="#f0c48e" />
                            <stop offset="0.55" stopColor="#d99f63" />
                            <stop offset="1" stopColor="#b97c46" />
                        </radialGradient>
                    </defs>
                    <path d="M16 116 C20 100 44 92 78 92 L148 92 C154 74 160 58 168 48 C172 60 172 76 170 92
                             C182 94 194 102 194 110 C194 120 178 124 152 124 L44 124 C26 124 12 124 16 116 Z"
                        fill="url(#fxSnailFoot)" stroke="#5f7a52" strokeWidth="4" strokeLinejoin="round" />
                    <g className="fx-snail-stalks">
                        <path d="M160 52 C158 38 150 28 140 24" fill="none" stroke="#5f7a52" strokeWidth="6" strokeLinecap="round" />
                        <path d="M170 50 C172 36 180 28 188 26" fill="none" stroke="#5f7a52" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="138" cy="22" r="11" fill="#fdfcf7" stroke="#5f7a52" strokeWidth="3.5" />
                        <circle cx="190" cy="24" r="11" fill="#fdfcf7" stroke="#5f7a52" strokeWidth="3.5" />
                        <circle cx="140" cy="24" r="4.5" fill="#33321f" />
                        <circle cx="188" cy="26" r="4.5" fill="#33321f" />
                        <circle cx="142" cy="22" r="1.6" fill="#fff" />
                        <circle cx="190" cy="24" r="1.6" fill="#fff" />
                    </g>
                    <path d="M172 72 q6 4 10 1" fill="none" stroke="#5f7a52" strokeWidth="3" strokeLinecap="round" />
                    <ellipse cx="184" cy="64" rx="5" ry="3.4" fill="#e2a4a4" opacity="0.55" />
                    <g className="fx-snail-shell">
                        <circle cx="86" cy="56" r="46" fill="url(#fxSnailShell)" stroke="#7c5230" strokeWidth="4.5" />
                        <path d="M86 56 m0 -30 a30 30 0 1 1 -30 30 a23 23 0 1 0 23 -23 a15 15 0 1 1 -15 15 a8 8 0 1 0 8 -8"
                            fill="none" stroke="#7c5230" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
                        <path d="M60 30 a38 38 0 0 1 34 -6" fill="none" stroke="#fff" strokeWidth="7"
                            strokeLinecap="round" opacity="0.35" />
                    </g>
                </svg>
            </div>
            <p className="fx-slowword">sloooow…</p>
        </Overlay>
    );
}

// ── 3. Ink Splat (the Blooper) ──────────────────────────────────────────────
// A cheeky squid pops up from the bottom edge, winks, and sprays four big
// luscious ink splats — layered blobs with darker cores, glossy highlights
// and dripping runs. They shrink and fade as the victim types.
const INK_SPLATS = [
    { left: '10%', top: '4%', s: 1.15, r: -8, d: 1.15 },
    { left: '52%', top: '-2%', s: 1.4, r: 14, d: 1.3, flip: true },
    { left: '64%', top: '40%', s: 0.95, r: -24, d: 1.5 },
    { left: '5%', top: '44%', s: 1.05, r: 32, d: 1.42, flip: true },
];
const INK_SPRAY = [
    { tx: '-26vw', ty: '-38vh', d: 0.95 },
    { tx: '8vw', ty: '-46vh', d: 1.05 },
    { tx: '22vw', ty: '-18vh', d: 1.15 },
    { tx: '-32vw', ty: '-12vh', d: 1.1 },
    { tx: '14vw', ty: '-34vh', d: 1.22 },
];

function InkSplat() {
    return (
        <svg viewBox="0 0 240 260" width="300" height="325">
            <defs>
                <radialGradient id="fxInkBody" cx="0.42" cy="0.38" r="0.85">
                    <stop offset="0" stopColor="#232a4e" />
                    <stop offset="0.6" stopColor="#181d3b" />
                    <stop offset="1" stopColor="#11142c" />
                </radialGradient>
            </defs>
            <circle cx="28" cy="40" r="8" fill="#151a36" opacity="0.9" />
            <circle cx="212" cy="58" r="6.5" fill="#151a36" opacity="0.85" />
            <circle cx="200" cy="176" r="9" fill="#151a36" opacity="0.9" />
            <circle cx="46" cy="190" r="6" fill="#151a36" opacity="0.85" />
            <path fill="url(#fxInkBody)" opacity="0.96"
                d="M120 14 C150 6 176 20 184 44 C210 48 224 72 212 94 C232 108 226 140 202 148
                   C204 172 178 190 152 182 C140 202 100 204 86 184 C58 194 30 178 30 152
                   C8 142 4 112 22 98 C8 78 20 50 46 46 C52 22 88 10 120 14 Z" />
            <path fill="#0b0e22" opacity="0.8"
                d="M118 58 C142 52 162 66 164 88 C178 100 172 124 154 130 C150 148 122 156 106 144
                   C84 150 66 134 70 114 C58 100 66 78 84 74 C90 62 104 60 118 58 Z" />
            <ellipse cx="94" cy="76" rx="32" ry="13" fill="#ffffff" opacity="0.14"
                transform="rotate(-18 94 76)" />
            <ellipse cx="82" cy="66" rx="12" ry="5" fill="#ffffff" opacity="0.28"
                transform="rotate(-18 82 66)" />
            <g className="fx-drip">
                <rect x="102" y="176" width="13" height="46" rx="6.5" fill="#151a36" opacity="0.92" />
                <circle cx="108.5" cy="222" r="8" fill="#151a36" opacity="0.92" />
            </g>
            <g className="fx-drip" style={{ animationDelay: '1.9s' }}>
                <rect x="152" y="168" width="10" height="34" rx="5" fill="#151a36" opacity="0.85" />
                <circle cx="157" cy="202" r="6.5" fill="#151a36" opacity="0.85" />
            </g>
            <g className="fx-drip" style={{ animationDelay: '2.5s' }}>
                <rect x="60" y="170" width="8" height="26" rx="4" fill="#151a36" opacity="0.8" />
                <circle cx="64" cy="196" r="5.5" fill="#151a36" opacity="0.8" />
            </g>
        </svg>
    );
}

function InkFx({ wipe = 0 }) {
    const shrink = Math.max(0.1, 1 - wipe * 0.15);
    const fade = Math.max(0.1, 1 - wipe * 0.11);
    return (
        <Overlay>
            {INK_SPLATS.map((b, k) => (
                <div key={k} className="fx-splat-slot"
                    style={{ left: b.left, top: b.top, transform: `scale(${b.s * shrink})`, opacity: fade }}>
                    <div className="fx-splat-pop" style={{
                        animationDelay: `${b.d}s`,
                        transform: `rotate(${b.r}deg)${b.flip ? ' scaleX(-1)' : ''}`,
                    }}>
                        <InkSplat />
                    </div>
                </div>
            ))}
            {INK_SPRAY.map((s, k) => (
                <span key={k} className="fx-ink-droplet"
                    style={{ '--fx-tx': s.tx, '--fx-ty': s.ty, animationDelay: `${s.d}s` }} />
            ))}
            <div className="fx-squid-rig">
                <svg className="fx-squid" viewBox="0 0 170 160" width="158" height="149">
                    <defs>
                        <linearGradient id="fxSquidSkin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#7d86cf" />
                            <stop offset="1" stopColor="#4a5296" />
                        </linearGradient>
                    </defs>
                    <g stroke="#3c4380" strokeWidth="11" strokeLinecap="round" fill="none">
                        <path className="fx-tentacle" d="M45 108 q-12 20 -4 40" />
                        <path className="fx-tentacle" style={{ animationDelay: '0.3s' }} d="M68 116 q-6 20 4 38" />
                        <path className="fx-tentacle" style={{ animationDelay: '0.15s' }} d="M92 118 q8 18 -2 38" />
                        <path className="fx-tentacle" style={{ animationDelay: '0.45s' }} d="M116 112 q14 18 8 38" />
                    </g>
                    <path d="M85 6 C126 6 148 40 144 78 C142 102 118 116 85 116 C52 116 28 102 26 78 C22 40 44 6 85 6 Z"
                        fill="url(#fxSquidSkin)" stroke="#343b73" strokeWidth="4.5" />
                    <path d="M46 26 L28 12 L40 36 Z" fill="#7d86cf" stroke="#343b73" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M124 26 L142 12 L130 36 Z" fill="#7d86cf" stroke="#343b73" strokeWidth="4" strokeLinejoin="round" />
                    <circle cx="60" cy="62" r="17" fill="#fdfcf7" />
                    <circle cx="110" cy="62" r="17" fill="#fdfcf7" />
                    <circle cx="64" cy="66" r="7.5" fill="#232848" />
                    <circle cx="66.5" cy="63" r="2.6" fill="#fff" />
                    <g className="fx-wink">
                        <circle cx="106" cy="66" r="7.5" fill="#232848" />
                        <circle cx="108.5" cy="63" r="2.6" fill="#fff" />
                    </g>
                    <ellipse cx="44" cy="84" rx="8" ry="5" fill="#e8a0b4" opacity="0.6" />
                    <ellipse cx="126" cy="84" rx="8" ry="5" fill="#e8a0b4" opacity="0.6" />
                    <circle cx="85" cy="94" r="7" fill="#232848" />
                </svg>
            </div>
        </Overlay>
    );
}

// ── 4. Jelly Text ───────────────────────────────────────────────────────────
// Translucent apricot jelly blobs with kawaii faces cling to the corners and
// wobble; body class fx-jelly makes the text stream itself jiggle. Blobs
// deflate as the victim types on.
const JELLY_BLOBS = [
    { style: { top: '-64px', left: '-70px', width: 220 }, o: '30% 30%', d: 0 },
    { style: { top: '-80px', right: '-64px', width: 250 }, o: '70% 30%', d: 0.5 },
    { style: { bottom: '-76px', left: '-58px', width: 230 }, o: '30% 70%', d: 0.9 },
    { style: { bottom: '-60px', right: '-72px', width: 210 }, o: '70% 70%', d: 0.3 },
];

function JellyFx({ wipe = 0 }) {
    useBodyClass('fx-jelly');
    const squish = Math.max(0.15, 1 - wipe * 0.13);
    return (
        <Overlay>
            {JELLY_BLOBS.map((b, k) => (
                <div key={k} className="fx-jelly-slot"
                    style={{ ...b.style, transform: `scale(${squish})`, opacity: Math.min(1, squish + 0.15) }}>
                    <svg className="fx-jelly-blob" style={{ transformOrigin: b.o, animationDelay: `${b.d}s` }}
                        viewBox="0 0 200 200" width="100%">
                        <defs>
                            <linearGradient id="fxJellyGrad" x1="0" y1="0" x2="0.4" y2="1">
                                <stop offset="0" stopColor="#f7c86e" stopOpacity="0.85" />
                                <stop offset="1" stopColor="#e08e3c" stopOpacity="0.8" />
                            </linearGradient>
                        </defs>
                        <path d="M100 22 C140 18 172 44 176 84 C180 122 156 168 112 174 C70 180 30 152 26 110 C22 70 52 26 100 22 Z"
                            fill="url(#fxJellyGrad)" stroke="#b06a24" strokeOpacity="0.5" strokeWidth="3" />
                        <ellipse cx="72" cy="58" rx="26" ry="12" fill="#fff" opacity="0.35" transform="rotate(-24 72 58)" />
                        <circle cx="138" cy="130" r="9" fill="#fff" opacity="0.18" />
                        <circle cx="60" cy="126" r="6" fill="#fff" opacity="0.18" />
                        <circle cx="82" cy="98" r="5.5" fill="#5c3a12" opacity="0.8" />
                        <circle cx="122" cy="98" r="5.5" fill="#5c3a12" opacity="0.8" />
                        <path d="M94 112 q8 7 16 0" fill="none" stroke="#5c3a12" strokeOpacity="0.8"
                            strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                </div>
            ))}
        </Overlay>
    );
}

// ── 5. Fog on the Glass ─────────────────────────────────────────────────────
// Soft misty panes creep in from the edges while wisps drift across; each
// typed word carves a squeegee streak until the glass clears at wipe ≥ 6.
const FOG_WISPS = [
    { top: '12%', left: '-10%', w: '46vw', h: '13vh', dur: 14, d: 0 },
    { top: '34%', left: '52%', w: '40vw', h: '11vh', dur: 17, d: -6 },
    { top: '58%', left: '8%', w: '38vw', h: '12vh', dur: 15, d: -3 },
    { top: '4%', left: '48%', w: '34vw', h: '10vh', dur: 19, d: -10 },
];

function FogFx({ wipe = 0 }) {
    const cleared = Math.min(1, wipe / 6);
    return (
        <Overlay style={{ opacity: 1 - cleared }}>
            <div className="fx-fog fx-fog-top" />
            <div className="fx-fog fx-fog-bottom" />
            <div className="fx-fog fx-fog-left" />
            <div className="fx-fog fx-fog-right" />
            {FOG_WISPS.map((w, k) => (
                <div key={k} className="fx-wisp" style={{
                    top: w.top, left: w.left, width: w.w, height: w.h,
                    animationDuration: `${w.dur}s`, animationDelay: `${w.d}s`,
                }} />
            ))}
            {Array.from({ length: Math.min(6, wipe) }, (_, k) => (
                <div key={k} className="fx-squeegee" style={{ left: `${6 + k * 15}%`, transform: `rotate(${k % 2 ? 2.5 : -2}deg)` }} />
            ))}
            <svg className="fx-smiley" viewBox="0 0 64 64" width="58" height="58" fill="none"
                stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <circle className="fx-smiley-draw" cx="32" cy="32" r="26" pathLength="100" />
                <path className="fx-smiley-draw" style={{ animationDelay: '2s' }} d="M20 38 q12 12 24 0" pathLength="100" />
                <circle className="fx-smiley-dot" cx="24" cy="26" r="2.6" fill="currentColor" stroke="none" />
                <circle className="fx-smiley-dot" style={{ animationDelay: '2.7s' }} cx="40" cy="26" r="2.6" fill="currentColor" stroke="none" />
            </svg>
        </Overlay>
    );
}

// ── 6. Blur Bomb ────────────────────────────────────────────────────────────
// A worried cartoon bomb drops down a whistle-line, bounces, and goes off as
// a soft comic POOF cloud (no flash) — leaving a frosted pane whose clear
// central window grows with every typed word.
function BombFx({ wipe = 0 }) {
    const rx = 230 + wipe * 70;
    const ry = 120 + wipe * 42;
    const blur = Math.max(1.5, 7 - wipe * 0.9);
    const mask = `radial-gradient(ellipse ${rx}px ${ry}px at 50% 52%, transparent 0 55%, black 100%)`;
    return (
        <Overlay>
            <div className="fx-whistle" />
            <div className="fx-bomb">
                <svg viewBox="0 0 120 130" width="104" height="112">
                    <defs>
                        <radialGradient id="fxBombShell" cx="0.36" cy="0.32" r="0.95">
                            <stop offset="0" stopColor="#4a5068" />
                            <stop offset="0.65" stopColor="#252a3c" />
                            <stop offset="1" stopColor="#171a26" />
                        </radialGradient>
                    </defs>
                    <path d="M52 30 C50 16 62 8 74 12" fill="none" stroke="#8a7a52" strokeWidth="5" strokeLinecap="round" />
                    <circle className="fx-ember" cx="76" cy="11" r="6" fill="#f2c94c" />
                    <rect x="46" y="26" width="28" height="14" rx="5" fill="#171a26" />
                    <circle cx="60" cy="82" r="42" fill="url(#fxBombShell)" stroke="#0e1018" strokeWidth="3" />
                    <ellipse cx="44" cy="64" rx="13" ry="7" fill="#fff" opacity="0.18" transform="rotate(-28 44 64)" />
                    <ellipse cx="50" cy="82" rx="4" ry="5.5" fill="#e9ecf5" opacity="0.9" />
                    <ellipse cx="72" cy="82" rx="4" ry="5.5" fill="#e9ecf5" opacity="0.9" />
                    <circle cx="61" cy="96" r="4.5" fill="#e9ecf5" opacity="0.75" />
                </svg>
            </div>
            <svg className="fx-poof" viewBox="0 0 380 300" width="380" height="300">
                <g style={{ fill: 'color-mix(in srgb, var(--text-primary) 16%, var(--surface-raised))' }}>
                    <circle cx="120" cy="150" r="62" />
                    <circle cx="190" cy="110" r="70" />
                    <circle cx="262" cy="150" r="60" />
                    <circle cx="150" cy="200" r="52" />
                    <circle cx="232" cy="202" r="54" />
                    <circle cx="70" cy="180" r="34" />
                    <circle cx="312" cy="182" r="32" />
                </g>
                <g style={{ fill: 'color-mix(in srgb, var(--text-primary) 7%, var(--surface-raised))' }}>
                    <circle cx="176" cy="150" r="52" />
                    <circle cx="228" cy="158" r="44" />
                </g>
                <text x="190" y="172" textAnchor="middle" fontSize="54" fontWeight="800"
                    letterSpacing="4" style={{ fill: 'var(--text-primary)', opacity: 0.7 }}>POOF!</text>
            </svg>
            <div className="fx-shockwave" />
            <div className="fx-blurpane" style={{
                backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
                maskImage: mask, WebkitMaskImage: mask,
            }} />
        </Overlay>
    );
}

// ── 7. Cat Deploy ───────────────────────────────────────────────────────────
// A fluffy cat hops out of its delivery box and plants itself in front of the
// text — tail swishing, slow blinks, gentle breathing — then gets bored and
// saunters off once the victim has typed 4 words.
function CatFx({ wipe = 0 }) {
    const bored = wipe >= 4;
    return (
        <Overlay>
            <svg className="fx-box" viewBox="0 0 110 80" width="96" height="70">
                <polygon points="10,26 55,10 100,26 55,42" fill="#c9a86a" stroke="#8a6f3e" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="10,26 10,66 55,80 55,42" fill="#b8955a" stroke="#8a6f3e" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="100,26 100,66 55,80 55,42" fill="#a3814a" stroke="#8a6f3e" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="10,26 -2,14 43,0 55,10" fill="#d4b57c" stroke="#8a6f3e" strokeWidth="3" strokeLinejoin="round" />
                <polygon points="100,26 112,14 67,0 55,10" fill="#d4b57c" stroke="#8a6f3e" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <div className={bored ? 'fx-cat fx-cat-leave' : 'fx-cat'}>
                <svg className="fx-cat-breathe" viewBox="0 0 240 200" width="216" height="180">
                    <defs>
                        <linearGradient id="fxCatFur" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#b8ab9e" />
                            <stop offset="1" stopColor="#8f8175" />
                        </linearGradient>
                    </defs>
                    <g className="fx-tail">
                        <path d="M178 156 C218 150 232 112 216 84" fill="none" stroke="#7d7065" strokeWidth="17" strokeLinecap="round" />
                        <path d="M178 156 C218 150 232 112 216 84" fill="none" stroke="#5c5248" strokeWidth="17"
                            strokeLinecap="round" strokeDasharray="8 18" strokeDashoffset="6" opacity="0.55" />
                    </g>
                    <path d="M58 186 C50 132 78 106 122 106 C166 106 192 134 186 186 Z"
                        fill="url(#fxCatFur)" stroke="#5c5248" strokeWidth="4" />
                    <path d="M104 118 L98 134 L106 128 L102 148 L112 138 L112 156 L120 140 L126 152 L128 132 L134 140 L132 120 Z"
                        fill="#d9cfc2" opacity="0.9" />
                    <ellipse cx="92" cy="182" rx="17" ry="10" fill="#b8ab9e" stroke="#5c5248" strokeWidth="3.5" />
                    <ellipse cx="140" cy="182" rx="17" ry="10" fill="#b8ab9e" stroke="#5c5248" strokeWidth="3.5" />
                    <path d="M86 182 v6 M92 183 v6 M98 182 v6" stroke="#5c5248" strokeWidth="2" strokeLinecap="round" />
                    <path d="M134 182 v6 M140 183 v6 M146 182 v6" stroke="#5c5248" strokeWidth="2" strokeLinecap="round" />
                    <path d="M74 46 L60 6 L102 28 Z" fill="#a3958a" stroke="#5c5248" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M146 46 L160 6 L118 28 Z" fill="#a3958a" stroke="#5c5248" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M74 38 L67 18 L88 29 Z" fill="#d9a5a5" />
                    <path d="M146 38 L153 18 L132 29 Z" fill="#d9a5a5" />
                    <circle cx="110" cy="72" r="46" fill="url(#fxCatFur)" stroke="#5c5248" strokeWidth="4" />
                    <path d="M96 30 q4 10 0 16 M110 28 q2 10 0 16 M124 30 q-4 10 0 16"
                        fill="none" stroke="#7d7065" strokeWidth="4" strokeLinecap="round" />
                    <g className="fx-blink">
                        <ellipse cx="92" cy="72" rx="7.5" ry="9" fill="#d9a545" />
                        <ellipse cx="92" cy="73" rx="3" ry="7" fill="#2c281f" />
                        <circle cx="94.5" cy="68" r="2" fill="#fff" />
                    </g>
                    <g className="fx-blink">
                        <ellipse cx="128" cy="72" rx="7.5" ry="9" fill="#d9a545" />
                        <ellipse cx="128" cy="73" rx="3" ry="7" fill="#2c281f" />
                        <circle cx="130.5" cy="68" r="2" fill="#fff" />
                    </g>
                    <path d="M106 88 L114 88 L110 93 Z" fill="#b98585" />
                    <path d="M110 93 q-5 7 -12 4 M110 93 q5 7 12 4" fill="none" stroke="#5c5248" strokeWidth="2.6" strokeLinecap="round" />
                    <g stroke="#5c5248" strokeWidth="1.8" strokeLinecap="round" opacity="0.85">
                        <line x1="66" y1="82" x2="34" y2="76" /><line x1="66" y1="90" x2="34" y2="92" />
                        <line x1="154" y1="82" x2="186" y2="76" /><line x1="154" y1="90" x2="186" y2="92" />
                    </g>
                </svg>
            </div>
        </Overlay>
    );
}

// ── 8. Word Thief ───────────────────────────────────────────────────────────
// A masked raccoon abseils in on a rope, snatches the coin sack with a little
// wiggle, and zips back up leaving a trail of tumbling coins. Short & punchy.
function ThiefFx({ wipe = 0 }) {
    return (
        <Overlay style={{ opacity: Math.max(0.2, 1 - wipe * 0.25) }}>
            <div className="fx-rope" />
            <div className="fx-sack-waiting">
                <svg viewBox="0 0 70 76" width="58" height="63">
                    <path d="M35 14 C58 16 62 42 58 58 C55 70 15 70 12 58 C8 42 12 16 35 14 Z"
                        fill="#c9a86a" stroke="#8a6f3e" strokeWidth="3.5" />
                    <path d="M26 14 q9 -8 18 0" fill="none" stroke="#8a6f3e" strokeWidth="4" strokeLinecap="round" />
                    <path d="M24 30 q11 8 22 0" fill="none" stroke="#8a6f3e" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                    <text x="35" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill="#6e5528">$</text>
                </svg>
            </div>
            <div className="fx-thief">
                <svg viewBox="0 0 150 160" width="120" height="128">
                    <path className="fx-thief-tail" d="M42 112 C16 118 6 96 16 76" fill="none"
                        stroke="#9a92a6" strokeWidth="15" strokeLinecap="round" />
                    <path className="fx-thief-tail" d="M42 112 C16 118 6 96 16 76" fill="none" stroke="#4a4356"
                        strokeWidth="15" strokeLinecap="round" strokeDasharray="7 13" strokeDashoffset="4" opacity="0.7" />
                    <line x1="82" y1="2" x2="76" y2="34" stroke="#4a4356" strokeWidth="5" strokeLinecap="round" />
                    <ellipse cx="72" cy="104" rx="31" ry="27" fill="#9a92a6" stroke="#4a4356" strokeWidth="3.5" />
                    <ellipse cx="72" cy="110" rx="17" ry="15" fill="#c4bccd" opacity="0.9" />
                    <path d="M56 128 q-3 12 4 16 M88 128 q3 12 -4 16" fill="none" stroke="#4a4356" strokeWidth="7" strokeLinecap="round" />
                    <circle cx="72" cy="54" r="27" fill="#a8a0b2" stroke="#4a4356" strokeWidth="3.5" />
                    <path d="M52 36 L44 16 L64 28 Z" fill="#a8a0b2" stroke="#4a4356" strokeWidth="3.5" strokeLinejoin="round" />
                    <path d="M92 36 L100 16 L80 28 Z" fill="#a8a0b2" stroke="#4a4356" strokeWidth="3.5" strokeLinejoin="round" />
                    <rect x="44" y="42" width="56" height="17" rx="8.5" fill="#37314a" />
                    <circle cx="60" cy="50" r="5.5" fill="#fdfcf7" />
                    <circle cx="84" cy="50" r="5.5" fill="#fdfcf7" />
                    <circle cx="61.5" cy="51" r="2.6" fill="#232030" />
                    <circle cx="82.5" cy="51" r="2.6" fill="#232030" />
                    <ellipse cx="72" cy="68" rx="11" ry="7.5" fill="#c4bccd" />
                    <circle cx="72" cy="65" r="3.6" fill="#232030" />
                    <path d="M96 74 q16 6 18 18" fill="none" stroke="#4a4356" strokeWidth="7" strokeLinecap="round" />
                    <g className="fx-sack-held">
                        <path d="M118 92 C136 94 140 114 137 126 C134 136 104 136 102 126 C99 114 102 94 118 92 Z"
                            fill="#c9a86a" stroke="#8a6f3e" strokeWidth="3" />
                        <path d="M111 92 q7 -6 14 0" fill="none" stroke="#8a6f3e" strokeWidth="3.5" strokeLinecap="round" />
                        <text x="119" y="122" textAnchor="middle" fontSize="17" fontWeight="800" fill="#6e5528">$</text>
                    </g>
                </svg>
            </div>
            {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} className="fx-coin"
                    style={{ animationDelay: `${1.5 + k * 0.14}s`, right: `${52 + k * 16}px` }}>🪙</span>
            ))}
        </Overlay>
    );
}

const FX_CSS = `
/* ── static bases (also the reduced-motion still frames) ─────────────────── */
.fx-conf { position: absolute; display: inline-block; opacity: 0.95; will-change: transform; }
.fx-conf-rect { display: block; width: 9px; height: 14px; border-radius: 2.5px; }
.fx-conf-dot { display: block; width: 7px; height: 7px; border-radius: 50%; opacity: 0.9; }
.fx-cannon { position: absolute; bottom: 10px; }
.fx-cannon-l { left: 14px; transform: rotate(-6deg); }
.fx-cannon-r { right: 14px; transform: rotate(6deg) scaleX(-1); }
.fx-cannon-burst { opacity: 0.6; }

.fx-snail-rig { position: absolute; bottom: 6px; left: 58%; }
.fx-snail-body { display: block; transform-origin: 50% 100%; }
.fx-snail-shell { transform-box: fill-box; transform-origin: 50% 60%; }
.fx-snail-stalks { transform-box: fill-box; transform-origin: 50% 100%; }
.fx-snail-trail { position: absolute; bottom: 10px; left: -4%; width: 63%; height: 15px;
    transform-origin: left center; border-radius: 10px; filter: blur(0.5px);
    background:
        radial-gradient(circle 5px at 12% 30%, rgba(190, 235, 205, 0.5) 0 45%, transparent 55%),
        radial-gradient(circle 4px at 34% 62%, rgba(190, 235, 205, 0.45) 0 45%, transparent 55%),
        radial-gradient(circle 5px at 58% 34%, rgba(190, 235, 205, 0.45) 0 45%, transparent 55%),
        radial-gradient(circle 4px at 80% 60%, rgba(190, 235, 205, 0.4) 0 45%, transparent 55%),
        linear-gradient(90deg, transparent, rgba(150, 214, 176, 0.22) 25%, rgba(150, 214, 176, 0.4)); }
.fx-slowword { position: absolute; bottom: 130px; left: 12%; font-style: italic; font-weight: 700;
    color: color-mix(in srgb, var(--text-primary) 55%, transparent); }

.fx-squid-rig { position: absolute; bottom: -14px; left: 42%; }
.fx-squid { display: block; }
.fx-wink { transform-box: fill-box; transform-origin: 50% 50%; }
.fx-tentacle { transform-box: fill-box; transform-origin: 50% 0%; }
.fx-splat-slot { position: absolute; }
.fx-splat-pop { opacity: 0.96; }
.fx-ink-droplet { position: absolute; bottom: 16%; left: 46%; width: 13px; height: 13px;
    border-radius: 50% 50% 50% 4px; background: #151a36; opacity: 0; }

.fx-jelly-slot { position: absolute; }
.fx-jelly-blob { display: block; }
body.fx-jelly .memorise-stream { animation: fx-jelly-wobble 1.4s ease-in-out infinite; }
body.fx-snailmo .memorise-stream .animate-pop { animation-duration: 1.4s !important; }
body.fx-snailmo .memorise-stream > div { transition-duration: 900ms !important; }

.fx-fog { position: absolute; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.fx-fog-top { inset: 0 0 66% 0;
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-raised) 72%, transparent),
        color-mix(in srgb, var(--surface-raised) 30%, transparent) 75%, transparent); }
.fx-fog-bottom { inset: 76% 0 0 0;
    background: linear-gradient(0deg, color-mix(in srgb, var(--surface-raised) 55%, transparent), transparent);
    mask-image: radial-gradient(ellipse 42% 110% at 50% 100%, transparent 0 52%, black 95%);
    -webkit-mask-image: radial-gradient(ellipse 42% 110% at 50% 100%, transparent 0 52%, black 95%); }
.fx-fog-left { inset: 18% 70% 16% 0;
    background: linear-gradient(90deg, color-mix(in srgb, var(--surface-raised) 66%, transparent), transparent); }
.fx-fog-right { inset: 18% 0 16% 70%;
    background: linear-gradient(-90deg, color-mix(in srgb, var(--surface-raised) 66%, transparent), transparent); }
.fx-wisp { position: absolute; border-radius: 50%; filter: blur(14px);
    background: radial-gradient(closest-side, color-mix(in srgb, var(--surface-raised) 58%, transparent), transparent); }
.fx-squeegee { position: absolute; top: -3%; bottom: 0; width: 10%;
    background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--surface-body) 80%, transparent) 45%, transparent); }
.fx-smiley { position: absolute; top: 8%; right: 8%;
    color: color-mix(in srgb, var(--text-primary) 50%, transparent); }
.fx-smiley-dot { opacity: 1; }

.fx-whistle { position: absolute; left: calc(50% - 2px); top: 0; width: 3px; height: 38vh; opacity: 0;
    transform-origin: top center;
    background: repeating-linear-gradient(180deg,
        color-mix(in srgb, var(--text-primary) 38%, transparent) 0 12px, transparent 12px 26px); }
.fx-bomb { position: absolute; left: 50%; top: 44%; margin: -56px 0 0 -52px; }
.fx-poof { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -55%); opacity: 0.55; }
.fx-shockwave { position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; margin: -35px 0 0 -35px;
    border: 4px solid color-mix(in srgb, var(--text-primary) 30%, transparent); border-radius: 50%; opacity: 0; }
.fx-blurpane { position: absolute; inset: 0;
    background: color-mix(in srgb, var(--surface-raised) 24%, transparent); }

.fx-box { position: absolute; bottom: 21%; left: 27%; }
.fx-cat { position: absolute; bottom: 23%; left: 37%; }
.fx-cat-breathe { display: block; transform-origin: 50% 100%; }
.fx-tail { transform-box: fill-box; transform-origin: 4% 96%; }
.fx-blink { transform-box: fill-box; transform-origin: 50% 50%; }

.fx-rope { position: absolute; top: 0; right: 128px; width: 3.5px; height: 36%; transform-origin: top center;
    background: repeating-linear-gradient(180deg,
        color-mix(in srgb, var(--text-primary) 50%, transparent) 0 9px,
        color-mix(in srgb, var(--text-primary) 28%, transparent) 9px 18px);
    border-radius: 2px; }
.fx-thief { position: absolute; top: 30%; right: 76px; }
.fx-thief-tail { transform-box: fill-box; transform-origin: 100% 20%; }
.fx-sack-waiting { position: absolute; top: 44%; right: 42px; }
.fx-sack-held { opacity: 0; }
.fx-coin { position: absolute; top: 42%; font-size: 20px; opacity: 0; }

/* ── motion (everything animated lives behind this gate) ─────────────────── */
@media (prefers-reduced-motion: no-preference) {
    .fx-conf-a { animation: fx-conf-fall-a 2.8s cubic-bezier(0.3, 0.1, 0.6, 1) both; }
    .fx-conf-b { animation: fx-conf-fall-b 2.8s cubic-bezier(0.3, 0.1, 0.6, 1) both; }
    @keyframes fx-conf-fall-a {
        0% { transform: translate3d(0, -108vh, 0) rotate(0deg); }
        100% { transform: translate3d(0, 0, 0) rotate(520deg); } }
    @keyframes fx-conf-fall-b {
        0% { transform: translate3d(0, -108vh, 0) rotate(0deg); }
        35% { transform: translate3d(26px, -62vh, 0) rotate(210deg); }
        70% { transform: translate3d(-18px, -26vh, 0) rotate(390deg); }
        100% { transform: translate3d(8px, 0, 0) rotate(560deg); } }
    .fx-cannon-l { animation: fx-cannon-pop-l 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .fx-cannon-r { animation: fx-cannon-pop-r 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    @keyframes fx-cannon-pop-l {
        0% { transform: translateY(90px) rotate(-24deg); }
        60% { transform: translateY(-8px) rotate(-2deg); }
        100% { transform: translateY(0) rotate(-6deg); } }
    @keyframes fx-cannon-pop-r {
        0% { transform: translateY(90px) rotate(24deg) scaleX(-1); }
        60% { transform: translateY(-8px) rotate(2deg) scaleX(-1); }
        100% { transform: translateY(0) rotate(6deg) scaleX(-1); } }
    .fx-cannon-burst { animation: fx-burst-fade 1.4s ease-out 0.5s both; }
    @keyframes fx-burst-fade { 0% { opacity: 0; } 25% { opacity: 0.85; } 100% { opacity: 0; } }
    .fx-conf, .fx-jelly-slot, .fx-splat-slot { transition: transform 0.35s ease-out, opacity 0.35s ease-out; }

    .fx-snail-rig { animation: fx-snail-crawl 8s linear both; }
    @keyframes fx-snail-crawl { 0% { transform: translateX(-78vw); } 100% { transform: translateX(0); } }
    .fx-snail-body { animation: fx-snail-inch 1.6s ease-in-out infinite; }
    @keyframes fx-snail-inch { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.06) scaleY(0.98); } }
    .fx-snail-shell { animation: fx-shell-rock 1.6s ease-in-out infinite; }
    @keyframes fx-shell-rock { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2.5deg); } }
    .fx-snail-stalks { animation: fx-stalk-bob 1.6s ease-in-out -0.4s infinite; }
    @keyframes fx-stalk-bob { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
    .fx-snail-trail { animation: fx-trail-grow 8s linear both; }
    @keyframes fx-trail-grow { 0% { transform: scaleX(0.02); opacity: 0; } 8% { opacity: 1; } 100% { transform: scaleX(1); } }
    .fx-slowword { animation: fx-drift-up 3s ease-out infinite; }
    @keyframes fx-drift-up { 0% { transform: translateY(0); opacity: 0; } 25% { opacity: 0.8; }
        100% { transform: translateY(-26px); opacity: 0; } }

    .fx-squid-rig { animation: fx-squid-pop 1.1s cubic-bezier(0.16, 1, 0.3, 1) both,
        fx-squid-sway 3.2s ease-in-out 1.1s infinite; }
    @keyframes fx-squid-pop {
        0% { transform: translateY(190px) scaleY(0.6); }
        55% { transform: translateY(-16px) scaleY(1.08); }
        100% { transform: translateY(6px) scaleY(1); } }
    @keyframes fx-squid-sway { 0%, 100% { transform: translateY(6px) rotate(-2deg); }
        50% { transform: translateY(2px) rotate(2deg); } }
    .fx-tentacle { animation: fx-tentacle-wave 1.8s ease-in-out infinite; }
    @keyframes fx-tentacle-wave { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
    .fx-wink { animation: fx-wink-once 0.55s ease-in-out 1.15s 1; }
    @keyframes fx-wink-once { 0%, 100% { transform: scaleY(1); } 45% { transform: scaleY(0.06); } }
    .fx-ink-droplet { animation: fx-spray-shot 0.55s cubic-bezier(0.2, 0.6, 0.5, 1) both; }
    @keyframes fx-spray-shot {
        0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
        12% { opacity: 1; }
        100% { transform: translate(var(--fx-tx), var(--fx-ty)) scale(1.1); opacity: 0; } }
    .fx-splat-pop { animation: fx-splat-land 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both,
        fx-splat-fade 7s ease-out both; }
    @keyframes fx-splat-land { 0% { scale: 0.2; } 65% { scale: 1.09; } 100% { scale: 1; } }
    @keyframes fx-splat-fade { 0% { opacity: 0; } 6% { opacity: 0; } 10% { opacity: 0.96; }
        72% { opacity: 0.9; } 100% { opacity: 0; } }
    .fx-drip { animation: fx-drip-run 2.4s ease-in both 1.6s; transform-box: fill-box; transform-origin: 50% 0%; }
    @keyframes fx-drip-run { 0% { transform: scaleY(0.06); } 100% { transform: scaleY(1); } }

    .fx-jelly-blob { animation: fx-jelly-wob 1.8s ease-in-out infinite; }
    @keyframes fx-jelly-wob {
        0%, 100% { transform: scale(1, 1) rotate(0deg); }
        33% { transform: scale(1.06, 0.94) rotate(1.2deg); }
        66% { transform: scale(0.95, 1.05) rotate(-1.2deg); } }
    @keyframes fx-jelly-wobble { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(2.5px, -2px); }
        50% { transform: translate(-2px, 2.5px); } 75% { transform: translate(2px, 1.5px); } }

    .fx-fog { animation: fx-fog-in 1.6s ease-out both; }
    @keyframes fx-fog-in { 0% { opacity: 0; } 100% { opacity: 1; } }
    .fx-fog-left { animation-delay: 0.25s; } .fx-fog-right { animation-delay: 0.4s; }
    .fx-fog-bottom { animation-delay: 0.55s; }
    .fx-wisp { animation-name: fx-wisp-drift; animation-timing-function: ease-in-out;
        animation-iteration-count: infinite; animation-direction: alternate; }
    @keyframes fx-wisp-drift { 0% { transform: translateX(0) translateY(0); }
        100% { transform: translateX(9vw) translateY(-2.5vh); } }
    .fx-squeegee { animation: fx-squeegee-swipe 0.55s cubic-bezier(0.2, 0.8, 0.4, 1) both; }
    @keyframes fx-squeegee-swipe { 0% { translate: 0 -45%; opacity: 0; } 100% { translate: 0 0; opacity: 1; } }
    .fx-smiley-draw { stroke-dasharray: 100; stroke-dashoffset: 100; animation: fx-smiley-trace 1.3s ease-in-out 1.1s both; }
    @keyframes fx-smiley-trace { to { stroke-dashoffset: 0; } }
    .fx-smiley-dot { opacity: 0; animation: fx-dot-in 0.4s ease-out 2.5s both; }
    @keyframes fx-dot-in { to { opacity: 1; } }

    .fx-whistle { animation: fx-whistle-line 0.9s ease-in both; }
    @keyframes fx-whistle-line { 0% { opacity: 0; transform: scaleY(0.2); transform-origin: top; }
        30% { opacity: 0.8; } 90% { opacity: 0.6; transform: scaleY(1); } 100% { opacity: 0; } }
    .fx-bomb { animation: fx-bomb-drop 1.2s cubic-bezier(0.4, 0, 0.6, 1) both; }
    @keyframes fx-bomb-drop {
        0% { transform: translateY(-70vh) rotate(-8deg); }
        52% { transform: translateY(0) rotate(0deg) scaleY(0.92); }
        66% { transform: translateY(-6vh) rotate(4deg); }
        80% { transform: translateY(0) scaleY(0.9); }
        90% { transform: translateY(0) scale(1.06); }
        100% { transform: translateY(0) scale(0); } }
    .fx-ember { animation: fx-ember-glow 0.9s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
    @keyframes fx-ember-glow { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.3); opacity: 1; } }
    .fx-poof { animation: fx-poof-bloom 2.4s ease-out 1.1s both; }
    @keyframes fx-poof-bloom {
        0% { transform: translate(-50%, -55%) scale(0.15); opacity: 0; }
        14% { transform: translate(-50%, -55%) scale(1.04); opacity: 0.92; }
        34% { transform: translate(-50%, -55%) scale(1.1); opacity: 0.85; }
        100% { transform: translate(-50%, -55%) scale(1.32); opacity: 0; } }
    .fx-shockwave { animation: fx-shock 1.1s ease-out 1.15s both; }
    @keyframes fx-shock { 0% { transform: scale(0.4); opacity: 0.85; } 100% { transform: scale(10); opacity: 0; } }
    .fx-blurpane { animation: fx-blur-in 6s ease-in-out both; }
    @keyframes fx-blur-in { 0% { opacity: 0; } 18% { opacity: 0; } 30% { opacity: 1; } 86% { opacity: 1; } 100% { opacity: 0; } }

    .fx-box { animation: fx-box-slide 0.9s cubic-bezier(0.2, 0.9, 0.4, 1) both; }
    @keyframes fx-box-slide { 0% { transform: translateX(-55vw) rotate(-4deg); } 100% { transform: translateX(0) rotate(0deg); } }
    .fx-cat { animation: fx-cat-arrive 1.5s cubic-bezier(0.34, 1.3, 0.64, 1) 0.5s both; }
    @keyframes fx-cat-arrive {
        0% { transform: translateY(60px) scale(0.6); opacity: 0; }
        45% { opacity: 1; }
        70% { transform: translateY(-14px) scale(1.02); }
        100% { transform: translateY(0) scale(1); opacity: 1; } }
    .fx-cat-breathe { animation: fx-cat-breathing 3.2s ease-in-out infinite; }
    @keyframes fx-cat-breathing { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.012, 0.985); } }
    .fx-cat-leave { animation: fx-cat-exit 1.9s ease-in both !important; }
    @keyframes fx-cat-exit {
        0% { transform: translateX(0) translateY(0); opacity: 1; }
        14% { transform: translateX(9vw) translateY(-8px); }
        28% { transform: translateX(19vw) translateY(0); }
        42% { transform: translateX(30vw) translateY(-8px); }
        56% { transform: translateX(42vw) translateY(0); }
        100% { transform: translateX(80vw) translateY(-4px); opacity: 1; } }
    .fx-tail { animation: fx-tail-swish 2.6s ease-in-out infinite; }
    @keyframes fx-tail-swish { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(15deg); } }
    .fx-blink { animation: fx-cat-blink 4s ease-in-out infinite; }
    @keyframes fx-cat-blink { 0%, 90%, 100% { transform: scaleY(1); } 94% { transform: scaleY(0.08); } }

    .fx-rope { animation: fx-rope-drop 0.45s ease-out both, fx-rope-sway 2s ease-in-out 0.45s infinite,
        fx-rope-fade 0.5s ease-in 2.55s both; }
    @keyframes fx-rope-drop { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
    @keyframes fx-rope-sway { 0%, 100% { rotate: -1.5deg; } 50% { rotate: 1.5deg; } }
    @keyframes fx-rope-fade { to { opacity: 0; } }
    .fx-thief { animation: fx-thief-run 3s cubic-bezier(0.5, 0, 0.4, 1) both; }
    @keyframes fx-thief-run {
        0% { transform: translateY(-85vh); }
        18% { transform: translateY(0); }
        26% { transform: translateY(0) rotate(-6deg); }
        34% { transform: translateY(0) rotate(5deg); }
        42% { transform: translateY(-3vh) rotate(0deg); }
        72% { transform: translateY(-4vh); }
        100% { transform: translateY(-90vh); } }
    .fx-thief-tail { animation: fx-thief-tailwag 0.9s ease-in-out infinite; }
    @keyframes fx-thief-tailwag { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(6deg); } }
    .fx-sack-waiting { animation: fx-sack-wait 3s linear both; }
    @keyframes fx-sack-wait { 0%, 32% { opacity: 1; } 37%, 100% { opacity: 0; } }
    .fx-sack-held { animation: fx-sack-grab 3s linear both; }
    @keyframes fx-sack-grab { 0%, 33% { opacity: 0; } 38%, 100% { opacity: 1; } }
    .fx-coin { animation: fx-coin-arc 0.95s cubic-bezier(0.4, 0, 0.7, 1) both; }
    @keyframes fx-coin-arc {
        0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        55% { transform: translate(-38px, -44px) rotate(160deg); opacity: 1; }
        100% { transform: translate(-64px, 40px) rotate(320deg); opacity: 0; } }
}
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
