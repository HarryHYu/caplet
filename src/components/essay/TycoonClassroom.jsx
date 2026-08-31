/**
 * The classroom — the top strip of the fullscreen Tycoon Arena. Every party
 * member is a monkey at a school desk with their tier's typewriter; monkeys
 * hammer their keys as their owners land words, automonkey assistants line
 * up in front of the desks, and sabotages are physically thrown across the
 * room from attacker to victim, exploding (comically, softly) on arrival.
 *
 * Pure presentation: the panel owns the socket and passes members, per-member
 * type pulses, and in-flight fx. Clicking a classmate's desk picks them as
 * the sabotage target.
 */
import { useEffect, useRef, useState } from 'react';

const TIER_COLORS = ['#8d8d8d', '#a5793f', '#c67434', '#5b6470', '#8c7a3c', '#d4a017', '#c7d0dd', '#7dd8e8'];
const TIER_DARK = ['#5c5c5c', '#5e441f', '#7c4218', '#333a44', '#544820', '#8a660c', '#7c8899', '#3795a8'];
const KIND_EMOJI = { confetti: '🎉', snail: '🐌', ink: '🦑', jelly: '🍮', fog: '🌫️', bomb: '💣', cat: '🐈', thief: '🦹' };
const BLOCK_EMOJI = { shield: '🛡️', umbrella: '☂️', pet: '🐈' };
const FLY_MS = 850;
const IMPACT_MS = 1300;

const prefersStill = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/** One tiny assistant. Deliberately simple — they are the hired help. */
function AutoMini({ x, y, robo }) {
    const fur = robo ? '#9aa6b8' : '#a06a3d';
    const face = robo ? '#c7d0dd' : '#d8ab7e';
    const line = robo ? '#5b6470' : '#6d4526';
    return (
        <g transform={`translate(${x} ${y})`}>
            {robo && <line x1="0" y1="-14" x2="0" y2="-9" stroke={line} strokeWidth="1.4" />}
            {robo && <circle cx="0" cy="-14.5" r="1.6" fill="#7dd8e8" />}
            <ellipse cx="0" cy="1.5" rx="4.6" ry="4" fill={fur} stroke={line} strokeWidth="1.2" />
            <circle cx="-4.4" cy="-7.5" r="1.8" fill={fur} stroke={line} strokeWidth="1" />
            <circle cx="4.4" cy="-7.5" r="1.8" fill={fur} stroke={line} strokeWidth="1" />
            <circle cx="0" cy="-6" r="4.4" fill={fur} stroke={line} strokeWidth="1.2" />
            <ellipse cx="0" cy="-5" rx="2.6" ry="2.1" fill={face} />
            <circle cx="-1" cy="-6" r="0.55" fill="#33261a" />
            <circle cx="1" cy="-6" r="0.55" fill="#33261a" />
        </g>
    );
}

/** Accessory art per wardrobe slot level, drawn over the monkey's head/eyes/torso. */
function Outfit({ acc = {}, sophisticated }) {
    return (
        <g>
            {/* body — scarf, waistcoat, tuxedo */}
            {acc.body === 1 && <path d="M40 70 q15 8 30 0 l0 6 q-15 8 -30 0 z" fill="#7c6bbf" stroke="#57499a" strokeWidth="1.4" />}
            {acc.body === 2 && (
                <path d="M42 72 q13 10 26 0 l-3 22 q-10 5 -20 0 z" fill="#4a4257" stroke="#332d3e" strokeWidth="1.5" />
            )}
            {acc.body === 3 && (
                <g>
                    <path d="M42 72 q13 10 26 0 l-3 23 q-10 5 -20 0 z" fill="#25222d" stroke="#141218" strokeWidth="1.5" />
                    <path d="M51 74 l4 5 4 -5 -2 16 -4 0 z" fill="#f4f1e8" />
                    <path d="M51.5 74 l3.5 3 3.5 -3 -1.4 4.5 -4.2 0 z" fill="#332d3e" />
                </g>
            )}
            {/* eyes — readers, monocle, gold monocle */}
            {acc.eyes === 1 && (
                <g fill="none" stroke="#3a3a46" strokeWidth="1.6">
                    <circle cx="48.5" cy="49" r="4.6" />
                    <circle cx="61.5" cy="49" r="4.6" />
                    <line x1="53" y1="49" x2="57" y2="49" />
                </g>
            )}
            {acc.eyes >= 2 && (
                <g fill="none" stroke={acc.eyes === 3 ? '#d4a017' : '#3a3a46'} strokeWidth="1.8">
                    <circle cx="61.5" cy="49" r="5" />
                    <path d="M65 53 q3 8 1 14" strokeWidth="1.1" />
                    {acc.eyes === 3 && <path d="M58.6 46.5 l2.4 2.4" stroke="#fff" strokeWidth="1.2" />}
                </g>
            )}
            {/* head — flat cap, top hat, crown */}
            {acc.head === 1 && (
                <g>
                    <path d="M40 39 q15 -10 30 0 l0 3 -30 0 z" fill="#7a8471" stroke="#59614f" strokeWidth="1.4" />
                    <path d="M67 41 q6 -1 8 2 l-8 1 z" fill="#59614f" />
                </g>
            )}
            {acc.head === 2 && (
                <g>
                    <rect x="45" y="18" width="20" height="17" rx="2" fill="#25222d" stroke="#141218" strokeWidth="1.5" />
                    <rect x="45" y="29" width="20" height="4" fill="#57499a" />
                    <rect x="39" y="33" width="32" height="4.5" rx="2.2" fill="#25222d" stroke="#141218" strokeWidth="1.5" />
                </g>
            )}
            {acc.head === 3 && (
                <g stroke="#8a660c" strokeWidth="1.4" strokeLinejoin="round">
                    <path d="M42 36 l2 -12 7 8 4 -11 4 11 7 -8 2 12 z" fill="#f2c94c" />
                    <circle cx="47" cy="30" r="1.5" fill="#7dd8e8" stroke="none" />
                    <circle cx="55" cy="27" r="1.5" fill="#e88bbf" stroke="none" />
                    <circle cx="63" cy="30" r="1.5" fill="#7dd8e8" stroke="none" />
                </g>
            )}
            {sophisticated && (
                <g className="twc-soph" fill="#f2c94c">
                    <path d="M28 30 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 z" />
                    <path d="M80 55 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 z" />
                </g>
            )}
        </g>
    );
}

/** Comic impact burst drawn over the victim's monkey. No flash, no red. */
function ImpactBurst({ kind, outcome }) {
    if (outcome !== 'hit') {
        return (
            <g className="twc-blockpop" transform="translate(55 40)">
                <circle r="13" fill="var(--surface-raised)" opacity="0.9" stroke="var(--accent)" strokeWidth="2" />
                <text y="5" textAnchor="middle" fontSize="14">{outcome === 'absorbed' ? '🧘' : BLOCK_EMOJI[outcome] || '🛡️'}</text>
            </g>
        );
    }
    return (
        <g className="twc-poof" transform="translate(55 42)">
            {kind === 'bomb' && (
                <g fill="#c9cfda" stroke="#8b95a3" strokeWidth="1.5">
                    <circle cx="-9" cy="2" r="9" /><circle cx="8" cy="0" r="10" />
                    <circle cx="0" cy="-8" r="9" /><circle cx="1" cy="7" r="8" />
                </g>
            )}
            {kind === 'ink' && (
                <g fill="#181d3b">
                    <circle cx="0" cy="0" r="10" /><circle cx="-10" cy="5" r="5" /><circle cx="10" cy="-4" r="6" />
                    <circle cx="5" cy="9" r="4" />
                </g>
            )}
            <g className="twc-stars" fill="#f2c94c" stroke="#8a660c" strokeWidth="0.8">
                <path d="M-16 -12 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 z" />
                <path d="M14 -16 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4 z" />
                <path d="M2 -22 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 z" />
            </g>
            {kind !== 'bomb' && kind !== 'ink' && <text y="4" textAnchor="middle" fontSize="15">{KIND_EMOJI[kind] || '💥'}</text>}
        </g>
    );
}

function Desk({ m, mine, pulse, impact, throwing, selected, onPick, deskRef }) {
    const tierFill = TIER_COLORS[m.tierIndex] || TIER_COLORS[0];
    const tierLine = TIER_DARK[m.tierIndex] || TIER_DARK[0];
    const autos = Math.max(0, Math.min(10, m.autos || 0));
    const dizzy = impact && impact.outcome === 'hit';
    return (
        <div ref={deskRef} className="flex min-w-0 flex-1 basis-0 flex-col items-center" style={{ maxWidth: 264 }}>
            <button type="button" disabled={mine} onClick={mine ? undefined : onPick}
                aria-label={mine ? `${m.name} (you)` : `Target ${m.name}`}
                className={`focus-ring w-full rounded-xl transition-shadow ${mine ? 'cursor-default' : 'cursor-pointer hover:bg-surface-soft/60'} ${selected ? 'ring-2 ring-accent' : ''}`}>
                <svg viewBox="0 0 170 150" className="h-auto w-full select-none" aria-hidden="true">
                    {/* chair + desk */}
                    <rect x="28" y="78" width="10" height="52" rx="3" fill="color-mix(in srgb, var(--text-primary) 24%, var(--surface-raised))" />
                    <rect x="20" y="103" width="132" height="9" rx="4" fill="color-mix(in srgb, var(--text-primary) 30%, var(--surface-raised))" />
                    <rect x="30" y="112" width="7" height="26" rx="2.5" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                    <rect x="134" y="112" width="7" height="26" rx="2.5" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                    {/* typewriter, in the member's tier material */}
                    <g>
                        <rect x="96" y="80" width="30" height="24" rx="2.5" fill="var(--surface-raised)" stroke="color-mix(in srgb, var(--text-primary) 28%, transparent)" strokeWidth="1.6" />
                        <line x1="100" y1="87" x2="121" y2="87" stroke="color-mix(in srgb, var(--text-primary) 26%, transparent)" strokeWidth="1.4" />
                        <line x1="100" y1="93" x2="117" y2="93" stroke="color-mix(in srgb, var(--text-primary) 18%, transparent)" strokeWidth="1.4" />
                        <rect x="90" y="93" width="44" height="12" rx="3.5" fill={tierFill} stroke={tierLine} strokeWidth="1.8" />
                        {[0, 1, 2, 3].map((k) => (
                            <circle key={k} cx={97 + k * 8} cy={100} r="1.9" fill={tierLine} />
                        ))}
                    </g>
                    {/* the monkey */}
                    <g className={`${pulse ? 'twc-type' : ''} ${dizzy ? 'twc-dizzy' : ''} ${throwing ? 'twc-throw' : ''}`} key={`p${pulse}-t${throwing}`}>
                        <g className="twc-hop">
                            <path d="M38 84 q-12 2 -10 -12 q1 -7 7 -6" fill="none" stroke="#8a5a34" strokeWidth="4.5" strokeLinecap="round" />
                            <ellipse cx="55" cy="84" rx="20" ry="18" fill="#a06a3d" stroke="#6d4526" strokeWidth="2.2" />
                            <ellipse cx="55" cy="88" rx="11" ry="9" fill="#d8ab7e" />
                            <circle cx="55" cy="52" r="17" fill="#a06a3d" stroke="#6d4526" strokeWidth="2.2" />
                            <circle cx="40" cy="46" r="5.5" fill="#a06a3d" stroke="#6d4526" strokeWidth="2" />
                            <circle cx="70" cy="46" r="5.5" fill="#a06a3d" stroke="#6d4526" strokeWidth="2" />
                            <circle cx="40" cy="46" r="2.6" fill="#d8ab7e" />
                            <circle cx="70" cy="46" r="2.6" fill="#d8ab7e" />
                            <ellipse cx="55" cy="56" rx="10.5" ry="8.5" fill="#d8ab7e" />
                            {m.watching ? (
                                <g stroke="#33261a" strokeWidth="1.8" strokeLinecap="round">
                                    <path d="M46.5 49 q2 1.6 4 0" fill="none" />
                                    <path d="M59.5 49 q2 1.6 4 0" fill="none" />
                                </g>
                            ) : (
                                <g>
                                    <circle cx="49" cy="49" r="2.3" fill="#33261a" />
                                    <circle cx="61" cy="49" r="2.3" fill="#33261a" />
                                    <circle cx="49.8" cy="48.2" r="0.8" fill="#fff" />
                                    <circle cx="61.8" cy="48.2" r="0.8" fill="#fff" />
                                </g>
                            )}
                            <path d="M51 60 q4 3.4 8 0" fill="none" stroke="#33261a" strokeWidth="1.7" strokeLinecap="round" />
                            <Outfit acc={m.acc} sophisticated={m.sophisticated} />
                        </g>
                        {/* arms onto the keys */}
                        <g className="twc-arms">
                            <path d="M68 76 q18 6 26 18" fill="none" stroke="#a06a3d" strokeWidth="6" strokeLinecap="round" />
                            <circle cx="96" cy="96" r="4" fill="#d8ab7e" stroke="#6d4526" strokeWidth="1.6" />
                        </g>
                    </g>
                    {/* zen bubble for watchers */}
                    {m.watching && (
                        <g className="twc-zen">
                            <ellipse cx="57" cy="66" rx="38" ry="44" fill="var(--accent)" opacity="0.10" />
                            <ellipse cx="57" cy="66" rx="38" ry="44" fill="none" stroke="var(--accent)" strokeWidth="1.6" opacity="0.45" strokeDasharray="3 5" />
                        </g>
                    )}
                    {/* the hired help */}
                    <g className="twc-crew">
                        {Array.from({ length: autos }).map((_, k) => (
                            <AutoMini key={k} x={16 + (k % 5) * 13} y={k < 5 ? 128 : 142} robo={false} />
                        ))}
                        {m.robo && <AutoMini x={152} y={131} robo />}
                    </g>
                    {m.goalHit && <text x="152" y="100" fontSize="13" textAnchor="middle">🏆</text>}
                    {impact && <ImpactBurst kind={impact.kind} outcome={impact.outcome} />}
                </svg>
                <span className="mt-0.5 flex w-full items-center justify-center gap-1.5 truncate px-1 pb-1 text-[11px] font-bold">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tierFill }} />
                    <span className={`truncate ${m.connected ? 'text-text-primary' : 'text-text-dim line-through'}`}>
                        {m.sophisticated && '🎩'}{m.watching && '🧘'}{m.name}{mine ? ' · you' : ''}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-extrabold tabular-nums text-text-dim">${(m.money ?? 0).toLocaleString()}</span>
                    {m.shields > 0 && <span className="shrink-0 text-[9px]">{'🛡️'.repeat(m.shields)}</span>}
                </span>
            </button>
        </div>
    );
}

export default function TycoonClassroom({ members = [], myId, pulses = {}, fx = [], selectedTarget, onPickTarget, code, goalWords }) {
    const wrapRef = useRef(null);
    const deskRefs = useRef({});
    const seen = useRef(new Set());
    const [impacts, setImpacts] = useState({});   // memberId -> {kind, outcome}
    const [throws, setThrows] = useState({});     // memberId -> count (retriggers pose)
    const [projectiles, setProjectiles] = useState([]); // {id, kind, x1,y1,x2,y2}

    // Turn each new fx into a throw pose, a projectile flight, then an impact.
    useEffect(() => {
        const still = prefersStill();
        fx.forEach((f) => {
            if (seen.current.has(f.id)) return;
            seen.current.add(f.id);
            const wrap = wrapRef.current?.getBoundingClientRect();
            const fromBox = deskRefs.current[f.from]?.getBoundingClientRect();
            const toBox = deskRefs.current[f.to]?.getBoundingClientRect();
            const showImpact = () => {
                setImpacts((prev) => ({ ...prev, [f.to]: { kind: f.kind, outcome: f.outcome } }));
                setTimeout(() => setImpacts((prev) => {
                    const next = { ...prev };
                    if (next[f.to]?.kind === f.kind) delete next[f.to];
                    return next;
                }), IMPACT_MS);
            };
            if (still || !wrap || !fromBox || !toBox) { showImpact(); return; }
            setThrows((prev) => ({ ...prev, [f.from]: (prev[f.from] || 0) + 1 }));
            setProjectiles((prev) => [...prev, {
                id: f.id,
                kind: f.kind,
                x1: fromBox.left - wrap.left + fromBox.width * 0.55,
                y1: fromBox.top - wrap.top + fromBox.height * 0.32,
                x2: toBox.left - wrap.left + toBox.width * 0.5,
                y2: toBox.top - wrap.top + toBox.height * 0.3,
            }]);
            setTimeout(() => {
                setProjectiles((prev) => prev.filter((p) => p.id !== f.id));
                showImpact();
            }, FLY_MS);
        });
    }, [fx]);

    return (
        <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    .twc-type .twc-arms { animation: twc-strike 0.24s ease-out; transform-box: fill-box; transform-origin: 20% 20%; }
                    .twc-type .twc-hop { animation: twc-hop 0.24s ease-out; transform-box: fill-box; }
                    .twc-throw .twc-arms { animation: twc-windup 0.5s ease-in-out; transform-box: fill-box; transform-origin: 20% 20%; }
                    .twc-dizzy { animation: twc-wobble 0.9s ease-in-out; transform-box: fill-box; transform-origin: 50% 70%; }
                    .twc-crew { animation: twc-sway 4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
                    .twc-zen { animation: twc-breathe-soft 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 60%; }
                    .twc-soph { animation: twc-glint 2.6s ease-in-out infinite; }
                    .twc-poof { animation: twc-pop 1.3s ease-out both; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twc-blockpop { animation: twc-pop 1.3s ease-out both; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twc-stars { animation: twc-orbit 1.3s linear both; transform-box: fill-box; transform-origin: 50% 50%; }
                    .twc-proj { animation: twc-fly ${FLY_MS}ms cubic-bezier(0.25, 0.1, 0.55, 1) both; }
                }
                @keyframes twc-strike { 0% { transform: rotate(0deg); } 45% { transform: rotate(9deg); } 100% { transform: rotate(0deg); } }
                @keyframes twc-hop { 0%,100% { transform: translateY(0); } 45% { transform: translateY(-2.5px); } }
                @keyframes twc-windup { 0% { transform: rotate(0deg); } 35% { transform: rotate(-55deg); } 70% { transform: rotate(14deg); } 100% { transform: rotate(0deg); } }
                @keyframes twc-wobble { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 55% { transform: rotate(4deg); } 80% { transform: rotate(-2deg); } }
                @keyframes twc-sway { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
                @keyframes twc-breathe-soft { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.03); opacity: 0.85; } }
                @keyframes twc-glint { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
                @keyframes twc-pop { 0% { transform: scale(0.3); opacity: 0; } 18% { transform: scale(1.15); opacity: 1; } 75% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.92); opacity: 0; } }
                @keyframes twc-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(120deg); } }
                @keyframes twc-fly {
                    0% { transform: translate(var(--x1), var(--y1)) scale(0.7) rotate(0deg); opacity: 0.4; }
                    12% { opacity: 1; }
                    50% { transform: translate(var(--xm), var(--ym)) scale(1.2) rotate(180deg); }
                    100% { transform: translate(var(--x2), var(--y2)) scale(1) rotate(360deg); opacity: 1; }
                }
            `}</style>
            {/* blackboard */}
            <div className="absolute inset-x-6 top-2 flex h-[26%] min-h-10 items-center justify-center rounded-lg border-4 border-[#7a5b3a] bg-[#2e4238] shadow-card">
                <p className="truncate px-4 font-hand text-sm font-bold tracking-wide text-[#e8e3d5] opacity-90">
                    {code ? `party ${code}${goalWords > 0 ? ` — first to ${goalWords} words` : ''}` : 'Typewriter Tycoon — type to earn'}
                </p>
            </div>
            {/* the desks */}
            <div className="absolute inset-x-2 bottom-0 top-[30%] flex items-end justify-center gap-1">
                {members.map((m) => (
                    <Desk key={m.id} m={m} mine={m.id === myId}
                        pulse={pulses[m.id] || 0}
                        impact={impacts[m.id]}
                        throwing={throws[m.id] || 0}
                        selected={selectedTarget === m.id}
                        onPick={() => onPickTarget?.(m.id)}
                        deskRef={(el) => { deskRefs.current[m.id] = el; }} />
                ))}
            </div>
            {/* in-flight sabotages */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {projectiles.map((p) => (
                    <span key={p.id} className="twc-proj absolute left-0 top-0 text-xl"
                        style={{
                            '--x1': `${p.x1}px`, '--y1': `${p.y1}px`,
                            '--x2': `${p.x2}px`, '--y2': `${p.y2}px`,
                            '--xm': `${(p.x1 + p.x2) / 2}px`, '--ym': `${Math.min(p.y1, p.y2) - 60}px`,
                        }}>
                        {KIND_EMOJI[p.kind] || '💥'}
                    </span>
                ))}
            </div>
        </div>
    );
}
