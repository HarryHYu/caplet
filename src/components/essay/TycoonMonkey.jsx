/**
 * The tycoon's monkey at his typewriter — pure inline SVG, no assets.
 * The typewriter's material tracks the player's tier (stone → diamond);
 * the monkey hammers the keys and hops on every landed word (typePulse),
 * and throws his arms up in a confetti cheer on milestones (celebrate).
 *
 * Scene: cozy desk. Monkey on the left, typewriter mid-right, warm lamp,
 * steaming mug, potted plant, crumpled drafts on the floor. Backdrop,
 * desk and paper ride the design tokens so dark mode just works.
 */
import { useEffect, useId, useRef, useState } from 'react';

const MATERIALS = {
    1: { light: '#b9b6b0', mid: '#8f8c86', dark: '#6b6862', keys: '#79766f', keyTop: '#a8a59e', accent: '#cfccc5', detail: '#514f4a' }, // stone
    2: { light: '#c99a5d', mid: '#a5793f', dark: '#7c5a2e', keys: '#8a6534', keyTop: '#c49a63', accent: '#e0b87e', detail: '#57401e' }, // wood
    3: { light: '#e8a468', mid: '#c67434', dark: '#9a5322', keys: '#a05a26', keyTop: '#e59a5b', accent: '#f4bd85', detail: '#743e17' }, // copper
    4: { light: '#8b95a3', mid: '#5b6470', dark: '#3f4650', keys: '#4a525d', keyTop: '#7d8794', accent: '#a7b0bd', detail: '#2c323a' }, // iron
    5: { light: '#c2ad64', mid: '#8c7a3c', dark: '#665824', keys: '#6f6030', keyTop: '#b7a45c', accent: '#d8c67e', detail: '#48401c' }, // bronze
    6: { light: '#f7dd7a', mid: '#d4a017', dark: '#a87d10', keys: '#b3880f', keyTop: '#f2c94c', accent: '#ffe89a', detail: '#755607' }, // gold
    7: { light: '#f2f5fa', mid: '#c7d0dd', dark: '#96a2b3', keys: '#a8b3c2', keyTop: '#e6ebf2', accent: '#ffffff', detail: '#66748a' }, // platinum
    8: { light: '#d7f6fb', mid: '#7dd8e8', dark: '#45a8bc', keys: '#58b8ca', keyTop: '#bfeef6', accent: '#f0fdff', detail: '#2b7c8e' }, // diamond
};

const FUR = { base: '#a06a3d', deep: '#845330', edge: '#57371a', face: '#ddb184', faceHi: '#efd3ac', ink: '#2c2013' };

const CONFETTI = [
    { x: 94, y: 42, dx: -28, dy: -30, rr: 210, c: '#a78bfa', shape: 'rect' },
    { x: 106, y: 34, dx: -14, dy: -40, rr: -160, c: '#22d3ee', shape: 'dot' },
    { x: 118, y: 30, dx: 2, dy: -44, rr: 150, c: '#f2c94c', shape: 'rect' },
    { x: 130, y: 33, dx: 18, dy: -38, rr: -220, c: '#34d399', shape: 'dot' },
    { x: 142, y: 40, dx: 32, dy: -28, rr: 180, c: '#f0abfc', shape: 'rect' },
    { x: 100, y: 46, dx: -22, dy: -20, rr: 120, c: '#60a5fa', shape: 'dot' },
    { x: 126, y: 46, dx: 24, dy: -18, rr: -140, c: '#fb923c', shape: 'rect' },
    { x: 114, y: 26, dx: 8, dy: -32, rr: 260, c: '#facc15', shape: 'dot' },
    { x: 88, y: 34, dx: -32, dy: -14, rr: -190, c: '#5eead4', shape: 'rect' },
    { x: 148, y: 32, dx: 34, dy: -20, rr: 170, c: '#c4b5fd', shape: 'dot' },
];

const KIND_EMOJI = { confetti: '🎉', snail: '🐌', jelly: '🍮', fog: '🌫️', cat: '🐈', thief: '🦹' };
const BLOCK_EMOJI = { shield: '🛡️', umbrella: '☂️', pet: '🐈' };

/**
 * Extra, all-optional layers for the classroom arena — the SAME scene, worn
 * differently per player: `acc` {head,eyes,body} wardrobe levels,
 * `sophisticated`, `watching` (zen bubble, eyes closed), `autos`/`robo`
 * (assistants on the floor), `impact` {kind, outcome} burst, and `throwing`
 * (a counter that swings the arm on each sabotage thrown).
 */
export default function TycoonMonkey({
    tier = 1, typePulse = 0, celebrate = 0, className = '',
    acc = null, sophisticated = false, watching = false,
    autos = 0, robo = false, impact = null, throwing = 0,
}) {
    const t = Math.max(1, Math.min(8, tier));
    const m = MATERIALS[t] || MATERIALS[1];
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const gid = (name) => `twm${uid}-${name}`;
    const [anim, setAnim] = useState({ n: 0, kind: '' });
    const first = useRef(true);
    useEffect(() => {
        if (first.current) return;
        setAnim((a) => ({ n: a.n + 1, kind: 'type' }));
    }, [typePulse]);
    useEffect(() => {
        if (first.current) return;
        setAnim((a) => ({ n: a.n + 1, kind: 'throw' }));
    }, [throwing]);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        setAnim((a) => ({ n: a.n + 1, kind: 'party' }));
    }, [celebrate]);
    const animClass = anim.kind === 'type' ? 'twm-typing' : anim.kind === 'party' ? 'twm-party' : anim.kind === 'throw' ? 'twm-throwing' : '';
    const dizzy = impact && impact.outcome === 'hit';

    const ink = 'color-mix(in srgb, var(--text-primary) 30%, transparent)';
    const inkSoft = 'color-mix(in srgb, var(--text-primary) 18%, transparent)';

    return (
        <div className={`w-full select-none ${className}`} aria-hidden="true">
            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    .twm-breathe { animation: twm-breathe 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
                    .twm-tail { animation: twm-tail 5.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 88% 85%; }
                    .twm-eyes { animation: twm-blink 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 55%; }
                    .twm-steam { animation: twm-steam 3s ease-in-out infinite; transform-box: fill-box; }
                    .twm-halo { animation: twm-halo 5.2s ease-in-out infinite; }
                    .twm-leaf { animation: twm-leaf 4.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
                    .twm-sheen { animation: twm-sheen 5.6s ease-in-out infinite; }
                    .twm-sparkle { animation: twm-sparkle 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twm-arm-a, .twm-arm-b { transform-box: fill-box; transform-origin: 0% 12%; }
                    .twm-hop, .twm-carriage, .twm-clack, .twm-keydip, .twm-confetti, .twm-typebar { transform-box: fill-box; }
                    .twm-typing .twm-arm-a { animation: twm-strike 0.28s ease-out; }
                    .twm-typing .twm-arm-b { animation: twm-strike 0.28s ease-out 0.06s; }
                    .twm-typing .twm-hop { animation: twm-hop 0.3s ease-out; }
                    .twm-typing .twm-carriage { animation: twm-carriage 0.3s ease-out; }
                    .twm-typing .twm-keydip { animation: twm-keydip 0.26s ease-out; }
                    .twm-typing .twm-clack { animation: twm-clack 0.36s ease-out; }
                    .twm-typing .twm-typebar { animation: twm-typebar 0.24s ease-out; transform-origin: 50% 100%; }
                    .twm-party .twm-arm-a { animation: twm-cheer-a 1s ease-in-out; }
                    .twm-party .twm-arm-b { animation: twm-cheer-b 1s ease-in-out; }
                    .twm-party .twm-hop { animation: twm-bounce 1s ease-in-out; }
                    .twm-party .twm-confetti { animation: twm-pop 1.15s cubic-bezier(0.2, 0.7, 0.4, 1) both; }
                    .twm-throwing .twm-arm-a { animation: twm-windup 0.55s ease-in-out; }
                    .twm-dizzy { animation: twm-wobble 0.9s ease-in-out; transform-box: fill-box; transform-origin: 50% 75%; }
                    .twm-zen { animation: twm-zen 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 60%; }
                    .twm-burst { animation: twm-burst 1.3s ease-out both; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twm-burststars { animation: twm-orbit 1.3s linear both; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twm-crew { animation: twm-sway 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
                }
                @keyframes twm-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.025); } }
                @keyframes twm-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(7deg); } }
                @keyframes twm-blink { 0%, 92.5%, 100% { transform: scaleY(1); } 95.5% { transform: scaleY(0.08); } }
                @keyframes twm-steam { 0% { transform: translateY(0); opacity: 0.55; } 100% { transform: translateY(-12px); opacity: 0; } }
                @keyframes twm-halo { 0%, 100% { opacity: 0.16; } 50% { opacity: 0.32; } }
                @keyframes twm-leaf { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
                @keyframes twm-sheen { 0% { transform: translateX(-70px); } 55%, 100% { transform: translateX(140px); } }
                @keyframes twm-sparkle { 0%, 100% { opacity: 0.15; transform: scale(0.75); } 50% { opacity: 0.95; transform: scale(1.1); } }
                @keyframes twm-strike { 0% { transform: rotate(0deg); } 45% { transform: rotate(9deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-hop { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
                @keyframes twm-carriage { 0%, 100% { transform: translateX(0); } 35% { transform: translateX(-3.5px); } }
                @keyframes twm-keydip { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(1.4px); } }
                @keyframes twm-clack { 0% { opacity: 0; transform: scale(0.4); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-5px) scale(1.15); } }
                @keyframes twm-typebar { 0%, 100% { transform: rotate(0deg); } 40% { transform: rotate(-18deg); } }
                @keyframes twm-cheer-a { 0% { transform: rotate(0deg); } 28% { transform: rotate(-128deg); } 55% { transform: rotate(-114deg); } 78% { transform: rotate(-126deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-cheer-b { 0% { transform: rotate(0deg); } 30% { transform: rotate(-146deg); } 58% { transform: rotate(-132deg); } 80% { transform: rotate(-142deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-bounce { 0%, 100% { transform: translateY(0); } 22% { transform: translateY(-6px); } 46% { transform: translateY(0); } 66% { transform: translateY(-3.5px); } 86% { transform: translateY(0); } }
                @keyframes twm-pop { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--dx, 0px), var(--dy, -28px)) rotate(var(--rr, 160deg)); opacity: 0; } }
                @keyframes twm-windup { 0% { transform: rotate(0deg); } 35% { transform: rotate(-60deg); } 70% { transform: rotate(16deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 55% { transform: rotate(4deg); } 80% { transform: rotate(-2deg); } }
                @keyframes twm-zen { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.03); opacity: 0.82; } }
                @keyframes twm-burst { 0% { transform: scale(0.3); opacity: 0; } 18% { transform: scale(1.15); opacity: 1; } 75% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.92); opacity: 0; } }
                @keyframes twm-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(120deg); } }
                @keyframes twm-sway { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
            `}</style>
            <svg viewBox="0 0 320 190" className="h-auto w-full" role="img">
                <defs>
                    <radialGradient id={gid('fur')} cx="38%" cy="28%" r="85%">
                        <stop offset="0%" stopColor="#bb8551" />
                        <stop offset="55%" stopColor={FUR.base} />
                        <stop offset="100%" stopColor={FUR.deep} />
                    </radialGradient>
                    <linearGradient id={gid('body')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={m.light} />
                        <stop offset="45%" stopColor={m.mid} />
                        <stop offset="100%" stopColor={m.dark} />
                    </linearGradient>
                    <linearGradient id={gid('platen')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={m.mid} />
                        <stop offset="50%" stopColor={m.detail} />
                        <stop offset="100%" stopColor={m.dark} />
                    </linearGradient>
                    <radialGradient id={gid('key')} cx="35%" cy="30%" r="80%">
                        <stop offset="0%" stopColor={m.keyTop} />
                        <stop offset="100%" stopColor={m.keys} />
                    </radialGradient>
                    <linearGradient id={gid('shade')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f7d774" />
                        <stop offset="100%" stopColor="#e0a92f" />
                    </linearGradient>
                    <linearGradient id={gid('sheen')} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity={t >= 7 ? 0.5 : 0.38} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={gid('bodyclip')}>
                        <rect x="172" y="106" width="88" height="24" rx="7" />
                    </clipPath>
                </defs>

                {/* ============ Backdrop & room ============ */}
                <rect x="0" y="0" width="320" height="190" rx="16" fill="var(--surface-body)" />
                <rect x="0" y="150" width="320" height="40" rx="10" fill="color-mix(in srgb, var(--text-primary) 7%, transparent)" />
                {/* framed banana on the wall */}
                <g>
                    <rect x="30" y="24" width="34" height="30" rx="3.5" fill="var(--surface-raised)" stroke={ink} strokeWidth="2.5" />
                    <rect x="35" y="29" width="24" height="20" rx="2" fill="color-mix(in srgb, var(--text-primary) 8%, var(--surface-raised))" />
                    <path d="M41 44 q6 4 12.5 -4 q-1.5 -2.5 -3 -2 q-3.5 5 -8 4.5 z" fill="#f2c94c" stroke="#a87d10" strokeWidth="1.4" strokeLinejoin="round" />
                </g>
                {/* warm light cone from the lamp (static, very soft) */}
                <path d="M272 90 L303 90 L312 127 L254 127 Z" fill="#f2c94c" opacity="0.08" />

                {/* ============ Desk (tokens, so it themes) ============ */}
                <rect x="34" y="147" width="11" height="34" rx="3" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                <rect x="275" y="147" width="11" height="34" rx="3" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                <rect x="33" y="177" width="13" height="5" rx="2.5" fill="color-mix(in srgb, var(--text-primary) 30%, var(--surface-raised))" />
                <rect x="274" y="177" width="13" height="5" rx="2.5" fill="color-mix(in srgb, var(--text-primary) 30%, var(--surface-raised))" />

                {/* crumpled draft balls on the floor */}
                <g>
                    <ellipse cx="66" cy="177" rx="7.5" ry="3" fill="color-mix(in srgb, var(--text-primary) 14%, transparent)" />
                    <circle cx="66" cy="171" r="6" fill="var(--surface-raised)" stroke={ink} strokeWidth="2" />
                    <path d="M62.5 170 l3 -2.5 l2.5 2.5 l-2.5 2.5 z" fill="none" stroke={inkSoft} strokeWidth="1.3" strokeLinejoin="round" />
                    <ellipse cx="86" cy="181" rx="6" ry="2.5" fill="color-mix(in srgb, var(--text-primary) 12%, transparent)" />
                    <circle cx="86" cy="176" r="4.6" fill="var(--surface-raised)" stroke={ink} strokeWidth="2" />
                    <path d="M84 175 l2.2 -1.6 l2 2" fill="none" stroke={inkSoft} strokeWidth="1.2" />
                </g>

                {/* ============ Monkey — body & head (seated behind the desk) ============ */}
                <g key={`mb-${anim.n}`} className={`${animClass} ${dizzy ? 'twm-dizzy' : ''}`}>
                    <g className="twm-hop">
                        <g className="twm-breathe">
                            {/* tail */}
                            <g className="twm-tail">
                                <path d="M92 116 C 66 122 58 100 70 88 C 76 82 84 84 85 90" fill="none" stroke={FUR.deep} strokeWidth="7.5" strokeLinecap="round" />
                                <path d="M92 116 C 66 122 58 100 70 88" fill="none" stroke={FUR.base} strokeWidth="4" strokeLinecap="round" />
                            </g>
                            {/* torso */}
                            <ellipse cx="116" cy="108" rx="30" ry="27" fill={`url(#${gid('fur')})`} stroke={FUR.edge} strokeWidth="3.2" />
                            <ellipse cx="116" cy="113" rx="18" ry="16" fill={FUR.face} />
                            <ellipse cx="112" cy="107" rx="10" ry="8" fill={FUR.faceHi} opacity="0.55" />
                            {/* ears */}
                            <circle cx="90" cy="52" r="9" fill={`url(#${gid('fur')})`} stroke={FUR.edge} strokeWidth="3" />
                            <circle cx="142" cy="52" r="9" fill={`url(#${gid('fur')})`} stroke={FUR.edge} strokeWidth="3" />
                            <circle cx="91" cy="52" r="4.2" fill={FUR.face} />
                            <circle cx="141" cy="52" r="4.2" fill={FUR.face} />
                            {/* head */}
                            <circle cx="116" cy="61" r="25" fill={`url(#${gid('fur')})`} stroke={FUR.edge} strokeWidth="3.2" />
                            {/* hair tuft */}
                            <path d="M108 38 q3 -6 7 -1 q2 -5 6 -1 q3 -4 6 1" fill="none" stroke={FUR.edge} strokeWidth="2.6" strokeLinecap="round" />
                            {/* face patch */}
                            <ellipse cx="106" cy="57" rx="9.5" ry="10.5" fill={FUR.face} />
                            <ellipse cx="126" cy="57" rx="9.5" ry="10.5" fill={FUR.face} />
                            <ellipse cx="116" cy="71" rx="15.5" ry="12" fill={FUR.face} />
                            <ellipse cx="112" cy="66" rx="9" ry="6" fill={FUR.faceHi} opacity="0.5" />
                            {/* eyes (blink on a slow loop; serenely closed while watching) */}
                            {watching ? (
                                <g stroke={FUR.edge} strokeWidth="2.2" strokeLinecap="round" fill="none">
                                    <path d="M103 60 q4 3 8 0" />
                                    <path d="M120 60 q4 3 8 0" />
                                </g>
                            ) : (
                                <g className="twm-eyes">
                                    <ellipse cx="107" cy="59" rx="5.4" ry="6.2" fill="#fdf7ea" stroke={FUR.edge} strokeWidth="1.6" />
                                    <ellipse cx="124" cy="59" rx="5.4" ry="6.2" fill="#fdf7ea" stroke={FUR.edge} strokeWidth="1.6" />
                                    <circle cx="108.6" cy="60" r="2.8" fill={FUR.ink} />
                                    <circle cx="125.6" cy="60" r="2.8" fill={FUR.ink} />
                                    <circle cx="107.7" cy="58.8" r="1" fill="#ffffff" />
                                    <circle cx="124.7" cy="58.8" r="1" fill="#ffffff" />
                                </g>
                            )}
                            {/* brows */}
                            <path d="M102 50.5 q4.5 -3 9 -0.5" fill="none" stroke={FUR.edge} strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M120 50 q4.5 -2.5 9 0.5" fill="none" stroke={FUR.edge} strokeWidth="2.2" strokeLinecap="round" />
                            {/* nose + mouth */}
                            <ellipse cx="113.5" cy="68.5" rx="1.5" ry="1.1" fill="#6d4526" />
                            <ellipse cx="119.5" cy="68.5" rx="1.5" ry="1.1" fill="#6d4526" />
                            <path d="M106 74.5 q10 8.5 21 0" fill="none" stroke={FUR.ink} strokeWidth="2.6" strokeLinecap="round" />
                            <path d="M111 79.5 q5 2.6 10.5 0" fill="none" stroke="#8a5a34" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />

                            {/* ── Wardrobe: body ── */}
                            {acc?.body === 1 && (
                                <g>
                                    <path d="M94 87 Q116 99 138 87 l-1.5 8 Q116 106 97 95 z" fill="#7c6bbf" stroke="#57499a" strokeWidth="2.2" strokeLinejoin="round" />
                                    <path d="M100 94 q-5 12 -2 22 l7 -2 q-2 -10 1 -18 z" fill="#8d7dd0" stroke="#57499a" strokeWidth="2" strokeLinejoin="round" />
                                </g>
                            )}
                            {acc?.body === 2 && (
                                <g>
                                    <path d="M92 90 Q116 104 140 90 L136 130 Q116 137 96 130 z" fill="#4a4257" stroke="#332d3e" strokeWidth="2.6" strokeLinejoin="round" />
                                    <path d="M110 96 l6 7 6 -7 -3 30 -6 0 z" fill={FUR.face} />
                                    <circle cx="112" cy="112" r="1.4" fill="#c9b458" />
                                    <circle cx="120" cy="112" r="1.4" fill="#c9b458" />
                                </g>
                            )}
                            {acc?.body === 3 && (
                                <g>
                                    <path d="M92 90 Q116 104 140 90 L136 131 Q116 138 96 131 z" fill="#25222d" stroke="#141218" strokeWidth="2.6" strokeLinejoin="round" />
                                    <path d="M109 95 l7 8 7 -8 -2.5 32 -9 0 z" fill="#f4f1e8" />
                                    <path d="M110.5 95.5 l5.5 5 5.5 -5 -2 7 -7 0 z" fill="#332d3e" />
                                    <path d="M112 99 l4 2.6 4 -2.6 0 5 -8 0 z" fill="#332d3e" stroke="#141218" strokeWidth="1" />
                                </g>
                            )}

                            {/* ── Wardrobe: eyes ── */}
                            {acc?.eyes === 1 && (
                                <g fill="none" stroke="#3a3a46" strokeWidth="2.4">
                                    <circle cx="107" cy="59" r="8" />
                                    <circle cx="124" cy="59" r="8" />
                                    <line x1="114" y1="59" x2="117" y2="59" />
                                    <path d="M99 57 q-5 -2 -8 -4" strokeWidth="2" />
                                    <path d="M132 57 q5 -2 8 -4" strokeWidth="2" />
                                </g>
                            )}
                            {acc?.eyes >= 2 && (
                                <g fill="none" stroke={acc.eyes === 3 ? '#d4a017' : '#3a3a46'} strokeWidth="2.6">
                                    <circle cx="124" cy="59" r="8.5" />
                                    <path d="M129 66 q4 12 1 22" strokeWidth="1.5" strokeDasharray={acc.eyes === 3 ? '2.5 2.5' : undefined} />
                                    {acc.eyes === 3 && <path d="M119.5 55 l3.4 3.4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />}
                                </g>
                            )}

                            {/* ── Wardrobe: head ── */}
                            {acc?.head === 1 && (
                                <g>
                                    <path d="M92 44 q24 -22 48 0 l0 4 q-24 -8 -48 0 z" fill="#7a8471" stroke="#59614f" strokeWidth="2.4" strokeLinejoin="round" />
                                    <path d="M138 45 q9 -1.5 12 3 l-12 1.5 z" fill="#59614f" />
                                    <path d="M100 39 q16 -12 32 0" fill="none" stroke="#8f9a85" strokeWidth="2" strokeLinecap="round" />
                                </g>
                            )}
                            {acc?.head === 2 && (
                                <g>
                                    <rect x="98" y="7" width="36" height="30" rx="3" fill="#25222d" stroke="#141218" strokeWidth="2.6" />
                                    <rect x="98" y="27" width="36" height="6" fill="#57499a" />
                                    <rect x="88" y="34" width="56" height="7" rx="3.5" fill="#25222d" stroke="#141218" strokeWidth="2.6" />
                                    <rect x="102" y="10" width="8" height="22" fill="#ffffff" opacity="0.08" />
                                </g>
                            )}
                            {acc?.head === 3 && (
                                <g stroke="#8a660c" strokeWidth="2.2" strokeLinejoin="round">
                                    <path d="M95 40 l3 -21 12 12 6 -17 6 17 12 -12 3 21 z" fill="#f2c94c" />
                                    <path d="M95 40 h42 v4 h-42 z" fill="#e0a92f" />
                                    <circle cx="103" cy="30" r="2.2" fill="#7dd8e8" stroke="none" />
                                    <circle cx="116" cy="24" r="2.2" fill="#e88bbf" stroke="none" />
                                    <circle cx="129" cy="30" r="2.2" fill="#7dd8e8" stroke="none" />
                                </g>
                            )}
                            {sophisticated && (
                                <g fill="#f2c94c">
                                    <path className="twm-sparkle" d="M84 34 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 z" />
                                    <path className="twm-sparkle" style={{ animationDelay: '-1.4s' }} d="M148 66 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 z" />
                                </g>
                            )}
                        </g>
                    </g>
                </g>

                {/* ============ Desk top (occludes the monkey's lap) ============ */}
                <ellipse cx="216" cy="139" rx="52" ry="4.5" fill="color-mix(in srgb, var(--text-primary) 14%, transparent)" />
                <rect x="18" y="127" width="284" height="13" rx="6" fill="color-mix(in srgb, var(--text-primary) 30%, var(--surface-raised))" />
                <rect x="18" y="127" width="284" height="4.5" rx="2.25" fill="color-mix(in srgb, var(--text-primary) 16%, var(--surface-raised))" />
                <rect x="26" y="140" width="268" height="7" rx="3" fill="color-mix(in srgb, var(--text-primary) 24%, var(--surface-raised))" />

                {/* ============ Potted plant ============ */}
                <g>
                    <g className="twm-leaf">
                        <path d="M41 111 C 34 102 33 92 40 86 C 44 94 44 103 41 111" fill="#4f9d5f" stroke="#357141" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M42 111 C 42 100 45 92 52 88 C 53 97 49 106 42 111" fill="#63b273" stroke="#357141" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M40 112 C 36 106 30 103 24 104 C 28 111 34 114 40 112" fill="#63b273" stroke="#357141" strokeWidth="2" strokeLinejoin="round" />
                    </g>
                    <path d="M30 111 l3.5 16 h13 l3.5 -16 z" fill="#b0714e" stroke="#7e4c30" strokeWidth="2.4" strokeLinejoin="round" />
                    <rect x="27.5" y="108.5" width="25" height="6" rx="3" fill="#c58358" stroke="#7e4c30" strokeWidth="2.4" />
                </g>

                {/* ============ Mug + steam ============ */}
                <g>
                    <ellipse cx="70" cy="128.5" rx="11" ry="2.5" fill="color-mix(in srgb, var(--text-primary) 14%, transparent)" />
                    <rect x="60" y="110.5" width="18" height="17" rx="3.5" fill="var(--accent)" opacity="0.85" />
                    <rect x="60" y="110.5" width="18" height="5" rx="2.5" fill="#ffffff" opacity="0.28" />
                    <path d="M78 115 q8.5 3.5 0 9.5" fill="none" stroke="var(--accent)" strokeWidth="3.2" opacity="0.85" />
                    <path className="twm-steam" d="M65 106 q3.5 -4.5 0 -9" fill="none" stroke="color-mix(in srgb, var(--text-primary) 35%, transparent)" strokeWidth="2.2" strokeLinecap="round" />
                    <path className="twm-steam" style={{ animationDelay: '-1.5s' }} d="M72 106 q-3.5 -4.5 0 -9" fill="none" stroke="color-mix(in srgb, var(--text-primary) 28%, transparent)" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* ============ Typewriter — its material is the tier ============ */}
                <g>
                    {/* carriage: rail, platen, paper — flicks left on each keystroke */}
                    <g key={`car-${anim.n}`} className={animClass}>
                        <g className="twm-carriage">
                            {/* paper */}
                            <rect x="196" y="52" width="48" height="44" rx="2.5" fill="var(--surface-raised)" stroke={ink} strokeWidth="2.2" />
                            <line x1="202" y1="62" x2="238" y2="62" stroke={ink} strokeWidth="2" strokeLinecap="round" />
                            <line x1="202" y1="70" x2="232" y2="70" stroke={inkSoft} strokeWidth="2" strokeLinecap="round" />
                            <line x1="202" y1="78" x2="236" y2="78" stroke={inkSoft} strokeWidth="2" strokeLinecap="round" />
                            <line x1="202" y1="86" x2="224" y2="86" stroke="color-mix(in srgb, var(--text-primary) 12%, transparent)" strokeWidth="2" strokeLinecap="round" />
                            {/* platen + rail */}
                            <rect x="164" y="95" width="104" height="12" rx="5.5" fill={`url(#${gid('platen')})`} stroke={m.detail} strokeWidth="2" />
                            <rect x="170" y="97" width="92" height="3" rx="1.5" fill={m.accent} opacity="0.45" />
                            <circle cx="164" cy="101" r="5" fill={m.mid} stroke={m.detail} strokeWidth="2.2" />
                            <circle cx="268" cy="101" r="5" fill={m.mid} stroke={m.detail} strokeWidth="2.2" />
                            {/* return lever */}
                            <path d="M166 95 q-9 -8 -6 -17" fill="none" stroke={m.detail} strokeWidth="3.4" strokeLinecap="round" />
                            <circle cx="160" cy="77" r="2.6" fill={m.accent} stroke={m.detail} strokeWidth="1.6" />
                        </g>
                        {/* type bar snapping up at the platen */}
                        <line className="twm-typebar" x1="214" y1="110" x2="217" y2="98" stroke={m.detail} strokeWidth="2.4" strokeLinecap="round" />
                        {/* keystroke clack burst */}
                        <g className="twm-clack" opacity="0" stroke={m.accent} strokeWidth="2.2" strokeLinecap="round">
                            <line x1="216" y1="88" x2="216" y2="82" />
                            <line x1="207" y1="90" x2="203" y2="85" />
                            <line x1="225" y1="90" x2="229" y2="85" />
                        </g>
                    </g>
                    {/* body */}
                    <rect x="172" y="106" width="88" height="24" rx="7" fill={`url(#${gid('body')})`} stroke={m.detail} strokeWidth="3" />
                    <rect x="178" y="109.5" width="76" height="4.5" rx="2.25" fill={m.accent} opacity="0.8" />
                    {/* tier flourishes */}
                    {t === 1 && (
                        <g stroke={m.detail} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85">
                            <path d="M181 112 l5 5 l-2 5" />
                            <path d="M251 110 l-4 6 l3 5" />
                        </g>
                    )}
                    {t === 2 && (
                        <g stroke={m.dark} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.6">
                            <path d="M178 121 q10 -2.5 20 0 q10 2.5 20 0" />
                            <path d="M216 127 q10 -2.5 20 0 q9 2 17 0" />
                        </g>
                    )}
                    {t === 3 && (
                        <g fill="#58b09a" opacity="0.6">
                            <circle cx="184" cy="123" r="2.6" />
                            <circle cx="190" cy="127" r="1.7" />
                            <circle cx="249" cy="112" r="2.2" />
                            <circle cx="253" cy="124" r="1.6" />
                        </g>
                    )}
                    {t === 4 && (
                        <g fill={m.accent} stroke={m.detail} strokeWidth="1.2">
                            <circle cx="178" cy="111.5" r="1.8" />
                            <circle cx="254" cy="111.5" r="1.8" />
                            <circle cx="178" cy="125" r="1.8" />
                            <circle cx="254" cy="125" r="1.8" />
                        </g>
                    )}
                    {t === 5 && (
                        <g stroke={m.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.75">
                            <path d="M177 126.5 h14" />
                            <path d="M241 126.5 h14" />
                        </g>
                    )}
                    {(t === 6 || t === 7) && (
                        <g clipPath={`url(#${gid('bodyclip')})`}>
                            <rect className="twm-sheen" x="168" y="102" width="26" height="34" fill={`url(#${gid('sheen')})`} transform="skewX(-18)" />
                            {t === 7 && <path d="M182 128 L200 108 M206 128 L226 108" stroke="#ffffff" strokeWidth="3" opacity="0.35" strokeLinecap="round" />}
                        </g>
                    )}
                    {t === 8 && (
                        <g clipPath={`url(#${gid('bodyclip')})`}>
                            <path d="M172 130 L196 106 L214 130 Z" fill="#ffffff" opacity="0.16" />
                            <path d="M214 130 L236 106 L258 130 Z" fill="#ffffff" opacity="0.1" />
                            <path d="M186 106 L206 130 L172 118 Z" fill="#ffffff" opacity="0.08" />
                        </g>
                    )}
                    {/* keys — two staggered rows */}
                    <g className="twm-keydip" key={`keys-${anim.n}-k`}>
                        {[0, 1, 2, 3, 4].map((k) => (
                            <circle key={k} cx={188 + k * 14} cy={117} r="3.6" fill={`url(#${gid('key')})`} stroke={m.detail} strokeWidth="1.6" />
                        ))}
                        {[0, 1, 2, 3].map((k) => (
                            <circle key={k} cx={195 + k * 14} cy={124.5} r="3.6" fill={`url(#${gid('key')})`} stroke={m.detail} strokeWidth="1.6" />
                        ))}
                    </g>
                    {/* space bar */}
                    <rect x="200" y="125" width="32" height="3.6" rx="1.8" fill={m.keyTop} stroke={m.detail} strokeWidth="1.4" />
                    {/* diamond sparkles */}
                    {t === 8 && (
                        <g fill="#eafcff">
                            <path className="twm-sparkle" d="M186 104 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 z" />
                            <path className="twm-sparkle" style={{ animationDelay: '-1.2s' }} d="M252 118 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" />
                            <path className="twm-sparkle" style={{ animationDelay: '-2s' }} d="M243 60 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 z" />
                        </g>
                    )}
                </g>

                {/* ============ Lamp (warm, gently pulsing halo) ============ */}
                <g>
                    <ellipse cx="286" cy="128" rx="14" ry="3" fill="color-mix(in srgb, var(--text-primary) 14%, transparent)" />
                    <path d="M286 123 q-3 -18 4 -30" fill="none" stroke="color-mix(in srgb, var(--text-primary) 42%, transparent)" strokeWidth="4" strokeLinecap="round" />
                    <rect x="275" y="121" width="22" height="6" rx="3" fill="color-mix(in srgb, var(--text-primary) 42%, var(--surface-raised))" />
                    <ellipse className="twm-halo" cx="287" cy="94" rx="18" ry="7" fill="#f2c94c" opacity="0.22" />
                    <path d="M272 90 h30 l-7.5 -15 h-15 z" fill={`url(#${gid('shade')})`} stroke="#8a6414" strokeWidth="2.4" strokeLinejoin="round" />
                    <ellipse cx="287" cy="90.5" rx="12" ry="2.6" fill="#fff3c2" opacity="0.9" />
                </g>

                {/* ============ Monkey arms — over the desk, hammering the keys ============ */}
                <g key={`ma-${anim.n}`} className={`${animClass} ${dizzy ? 'twm-dizzy' : ''}`}>
                    <g className="twm-hop">
                        <g className="twm-arm-a">
                            <path d="M134 88 Q 172 92 192 112" fill="none" stroke={FUR.base} strokeWidth="10" strokeLinecap="round" />
                            <path d="M134 88 Q 172 92 192 112" fill="none" stroke={FUR.edge} strokeWidth="13" strokeLinecap="round" opacity="0.28" />
                            <circle cx="193" cy="114" r="6.5" fill={FUR.face} stroke={FUR.edge} strokeWidth="2.4" />
                            <path d="M189.5 111.5 q3.5 -2 7 0" fill="none" stroke={FUR.edge} strokeWidth="1.3" opacity="0.6" />
                        </g>
                        <g className="twm-arm-b">
                            <path d="M136 101 Q 178 106 210 118" fill="none" stroke={FUR.base} strokeWidth="10" strokeLinecap="round" />
                            <circle cx="211" cy="119.5" r="6.5" fill={FUR.face} stroke={FUR.edge} strokeWidth="2.4" />
                            <path d="M207.5 117 q3.5 -2 7 0" fill="none" stroke={FUR.edge} strokeWidth="1.3" opacity="0.6" />
                        </g>
                    </g>
                </g>

                {/* ============ Celebration confetti ============ */}
                <g key={`party-${anim.n}`} className={animClass}>
                    {anim.kind === 'party' && CONFETTI.map((p, i) => (
                        p.shape === 'rect' ? (
                            <rect key={i} className="twm-confetti" x={p.x - 2.2} y={p.y - 3} width="4.4" height="6" rx="1"
                                fill={p.c} opacity="0"
                                style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rr': `${p.rr}deg`, animationDelay: `${i * 0.035}s` }} />
                        ) : (
                            <circle key={i} className="twm-confetti" cx={p.x} cy={p.y} r="2.5"
                                fill={p.c} opacity="0"
                                style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rr': `${p.rr}deg`, animationDelay: `${i * 0.035}s` }} />
                        )
                    ))}
                </g>

                {/* ============ The hired help, on the floor in front of the desk ============ */}
                {(autos > 0 || robo) && (
                    <g className="twm-crew">
                        {Array.from({ length: Math.max(0, Math.min(10, autos)) }).map((_, k) => {
                            const x = 62 + (k % 5) * 21;
                            const y = k < 5 ? 160 : 178;
                            return (
                                <g key={k} transform={`translate(${x} ${y})`}>
                                    <ellipse cx="0" cy="9" rx="7" ry="2.2" fill="color-mix(in srgb, var(--text-primary) 12%, transparent)" />
                                    <ellipse cx="0" cy="3" rx="6.4" ry="5.6" fill={FUR.base} stroke={FUR.edge} strokeWidth="1.6" />
                                    <circle cx="-6.2" cy="-9.5" r="2.5" fill={FUR.base} stroke={FUR.edge} strokeWidth="1.3" />
                                    <circle cx="6.2" cy="-9.5" r="2.5" fill={FUR.base} stroke={FUR.edge} strokeWidth="1.3" />
                                    <circle cx="0" cy="-7.5" r="6" fill={FUR.base} stroke={FUR.edge} strokeWidth="1.6" />
                                    <ellipse cx="0" cy="-6" rx="3.6" ry="3" fill={FUR.face} />
                                    <circle cx="-1.4" cy="-7.4" r="0.8" fill={FUR.ink} />
                                    <circle cx="1.4" cy="-7.4" r="0.8" fill={FUR.ink} />
                                    <path d="M-1.4 -4.6 q1.4 1 2.8 0" fill="none" stroke={FUR.ink} strokeWidth="0.8" strokeLinecap="round" />
                                </g>
                            );
                        })}
                        {robo && (
                            <g transform="translate(178 162)">
                                <ellipse cx="0" cy="10" rx="7.5" ry="2.2" fill="color-mix(in srgb, var(--text-primary) 12%, transparent)" />
                                <line x1="0" y1="-19" x2="0" y2="-14" stroke="#5b6470" strokeWidth="1.8" />
                                <circle cx="0" cy="-20" r="2" fill="#7dd8e8" />
                                <ellipse cx="0" cy="3.5" rx="6.6" ry="6" fill="#9aa6b8" stroke="#5b6470" strokeWidth="1.7" />
                                <circle cx="-6.4" cy="-10" r="2.6" fill="#9aa6b8" stroke="#5b6470" strokeWidth="1.4" />
                                <circle cx="6.4" cy="-10" r="2.6" fill="#9aa6b8" stroke="#5b6470" strokeWidth="1.4" />
                                <circle cx="0" cy="-8" r="6.3" fill="#9aa6b8" stroke="#5b6470" strokeWidth="1.7" />
                                <ellipse cx="0" cy="-6.5" rx="3.8" ry="3.1" fill="#c7d0dd" />
                                <rect x="-2.6" y="-8.4" width="2" height="2" rx="0.5" fill="#2b7c8e" />
                                <rect x="0.8" y="-8.4" width="2" height="2" rx="0.5" fill="#2b7c8e" />
                                <line x1="-1.6" y1="-4.8" x2="1.6" y2="-4.8" stroke="#5b6470" strokeWidth="0.9" />
                            </g>
                        )}
                    </g>
                )}

                {/* ============ Zen bubble (watch mode absorbs everything) ============ */}
                {watching && (
                    <g className="twm-zen">
                        <ellipse cx="116" cy="86" rx="56" ry="62" fill="var(--accent)" opacity="0.09" />
                        <ellipse cx="116" cy="86" rx="56" ry="62" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.45" strokeDasharray="4 7" />
                    </g>
                )}

                {/* ============ Sabotage impact burst ============ */}
                {impact && impact.outcome !== 'hit' && (
                    <g className="twm-burst" transform="translate(116 44)">
                        <circle r="15" fill="var(--surface-raised)" opacity="0.92" stroke="var(--accent)" strokeWidth="2.4" />
                        <text y="6" textAnchor="middle" fontSize="16">{impact.outcome === 'absorbed' ? '🧘' : BLOCK_EMOJI[impact.outcome] || '🛡️'}</text>
                    </g>
                )}
                {impact && impact.outcome === 'hit' && (
                    <g className="twm-burst" transform="translate(116 48)">
                        {impact.kind === 'bomb' && (
                            <g fill="#c9cfda" stroke="#8b95a3" strokeWidth="1.8">
                                <circle cx="-11" cy="2" r="11" /><circle cx="10" cy="0" r="12" />
                                <circle cx="0" cy="-10" r="11" /><circle cx="1" cy="9" r="10" />
                            </g>
                        )}
                        {impact.kind === 'ink' && (
                            <g fill="#181d3b">
                                <circle cx="0" cy="0" r="12" /><circle cx="-12" cy="6" r="6" /><circle cx="12" cy="-5" r="7" />
                                <circle cx="6" cy="11" r="5" />
                            </g>
                        )}
                        <g className="twm-burststars" fill="#f2c94c" stroke="#8a660c" strokeWidth="1">
                            <path d="M-19 -14 l1.8 4 4 1.8 -4 1.8 -1.8 4 -1.8 -4 -4 -1.8 4 -1.8 z" />
                            <path d="M17 -19 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 z" />
                            <path d="M2 -26 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4 z" />
                        </g>
                        {impact.kind !== 'bomb' && impact.kind !== 'ink' && (
                            <text y="5" textAnchor="middle" fontSize="17">{KIND_EMOJI[impact.kind] || '💥'}</text>
                        )}
                    </g>
                )}
            </svg>
        </div>
    );
}
