/**
 * The classroom — the top strip of the fullscreen Tycoon Arena. Every party
 * member gets the REAL TycoonMonkey desk scene (identical art to the side
 * panel) dressed in their own wardrobe, with their automonkeys on the floor
 * and a zen bubble when they watch. Sabotages are physically thrown across
 * the room from attacker to victim and burst on arrival.
 *
 * Pure presentation: the panel owns the socket and passes members, per-member
 * type pulses, and in-flight fx. Clicking a classmate's scene picks them as
 * the sabotage target.
 */
import { useEffect, useRef, useState } from 'react';
import TycoonMonkey from './TycoonMonkey';

const TIER_DOTS = ['#8d8d8d', '#a5793f', '#c67434', '#5b6470', '#8c7a3c', '#d4a017', '#c7d0dd', '#7dd8e8'];
const KIND_EMOJI = { confetti: '🎉', snail: '🐌', ink: '🦑', jelly: '🍮', fog: '🌫️', bomb: '💣', cat: '🐈', thief: '🦹' };
const FLY_MS = 850;
const IMPACT_MS = 1300;

const prefersStill = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export default function TycoonClassroom({ members = [], myId, pulses = {}, fx = [], selectedTarget, onPickTarget, code, goalWords }) {
    const wrapRef = useRef(null);
    const deskRefs = useRef({});
    const seen = useRef(new Set());
    const [impacts, setImpacts] = useState({});   // memberId -> {kind, outcome}
    const [throws, setThrows] = useState({});     // memberId -> count (retriggers the arm swing)
    const [projectiles, setProjectiles] = useState([]); // {id, kind, x1,y1,x2,y2}

    // Turn each new fx into a throw pose, a projectile flight, then an impact.
    useEffect(() => {
        const still = prefersStill();
        fx.forEach((f) => {
            if (seen.current.has(f.id)) return;
            seen.current.add(f.id);
            const wrap = wrapRef.current?.getBoundingClientRect();
            // Measure the scene SVGs, not the desk containers — the svg is
            // centred with side margins, and the monkey's head sits at a fixed
            // fraction of its 320x190 viewBox. Aim there, dead centre.
            const fromBox = deskRefs.current[f.from]?.querySelector('svg')?.getBoundingClientRect();
            const toBox = deskRefs.current[f.to]?.querySelector('svg')?.getBoundingClientRect();
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
            // Head centre in the TycoonMonkey viewBox: (116, 55) of 320x190.
            // The emoji glyph anchors top-left, so pull back half its size.
            const HEAD_X = 116 / 320;
            const HEAD_Y = 55 / 190;
            const HALF_GLYPH = 13;
            setProjectiles((prev) => [...prev, {
                id: f.id,
                kind: f.kind,
                x1: fromBox.left - wrap.left + fromBox.width * 0.55 - HALF_GLYPH,
                y1: fromBox.top - wrap.top + fromBox.height * 0.45 - HALF_GLYPH,
                x2: toBox.left - wrap.left + toBox.width * HEAD_X - HALF_GLYPH,
                y2: toBox.top - wrap.top + toBox.height * HEAD_Y - HALF_GLYPH,
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
                    .twc-proj { animation: twc-fly ${FLY_MS}ms cubic-bezier(0.25, 0.1, 0.55, 1) both; }
                }
                @keyframes twc-fly {
                    0% { transform: translate(var(--x1), var(--y1)) scale(0.7) rotate(0deg); opacity: 0.4; }
                    12% { opacity: 1; }
                    50% { transform: translate(var(--xm), var(--ym)) scale(1.2) rotate(180deg); }
                    100% { transform: translate(var(--x2), var(--y2)) scale(1) rotate(360deg); opacity: 1; }
                }
            `}</style>
            {/* slim chalk strip */}
            <p className="pointer-events-none absolute inset-x-0 top-0 z-10 truncate px-4 text-center font-hand text-[11px] font-bold tracking-wide text-text-dim">
                {code ? `party ${code}${goalWords > 0 ? ` — first to ${goalWords} words` : ''}` : 'type to earn'}
            </p>
            {/* the desks — each one is the real monkey scene */}
            <div className="absolute inset-x-1 bottom-0 top-3 flex items-end justify-center gap-2">
                {members.map((m) => {
                    const mine = m.id === myId;
                    const targeted = selectedTarget === m.id;
                    return (
                        <div key={m.id} ref={(el) => { deskRefs.current[m.id] = el; }}
                            className="flex h-full min-w-0 flex-1 basis-0 flex-col items-center justify-end" style={{ maxWidth: 460 }}>
                            <button type="button" disabled={mine} onClick={mine ? undefined : () => onPickTarget?.(m.id)}
                                aria-label={mine ? `${m.name} (you)` : `Target ${m.name}`}
                                className={`focus-ring flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-end rounded-xl ${mine ? 'cursor-default' : 'cursor-pointer'}`}>
                                <span className="pointer-events-none block min-h-0 w-full flex-1">
                                    <TycoonMonkey
                                        tier={(m.tierIndex ?? 0) + 1}
                                        typePulse={pulses[m.id] || 0}
                                        acc={m.acc}
                                        sophisticated={m.sophisticated}
                                        watching={m.watching}
                                        autos={m.autos}
                                        robo={m.robo}
                                        impact={impacts[m.id]}
                                        throwing={throws[m.id] || 0}
                                        className="mx-auto h-full max-w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full" />
                                </span>
                                <span className={`mb-0.5 flex w-full items-center justify-center gap-1.5 truncate px-1 text-[11px] font-bold ${targeted ? 'text-accent' : ''}`}>
                                    {targeted && <span aria-hidden="true">⚔️</span>}
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_DOTS[m.tierIndex] || TIER_DOTS[0] }} />
                                    <span className={`truncate ${m.connected ? (targeted ? 'text-accent' : 'text-text-primary') : 'text-text-dim line-through'}`}>
                                        {m.goalHit && '🏆'}{m.sophisticated && '🎩'}{m.watching && '🧘'}{m.name}{mine ? ' · you' : ''}
                                    </span>
                                    <span className="shrink-0 font-mono text-[10px] font-extrabold tabular-nums text-text-dim">${(m.money ?? 0).toLocaleString()}</span>
                                    {m.shields > 0 && <span className="shrink-0 text-[9px]">{'🛡️'.repeat(m.shields)}</span>}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
            {/* in-flight sabotages */}
            <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                {projectiles.map((p) => (
                    <span key={p.id} className="twc-proj absolute left-0 top-0 text-2xl"
                        style={{
                            '--x1': `${p.x1}px`, '--y1': `${p.y1}px`,
                            '--x2': `${p.x2}px`, '--y2': `${p.y2}px`,
                            '--xm': `${(p.x1 + p.x2) / 2}px`, '--ym': `${Math.min(p.y1, p.y2) - 70}px`,
                        }}>
                        {KIND_EMOJI[p.kind] || '💥'}
                    </span>
                ))}
            </div>
        </div>
    );
}
