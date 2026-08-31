/**
 * The tycoon's monkey at his typewriter — pure SVG, no assets. The
 * typewriter's material tracks the player's tier (stone → diamond); the
 * monkey hops and strikes the keys on every landed word (typePulse), and
 * throws his arms up on milestones (celebrate).
 */
import { useEffect, useRef, useState } from 'react';

const MATERIALS = {
    1: { body: '#8d8d8d', keys: '#6f6f6f', accent: '#a7a7a7', detail: '#5c5c5c' }, // stone
    2: { body: '#a5793f', keys: '#7c5a2e', accent: '#c49a63', detail: '#5e441f' }, // wood
    3: { body: '#c67434', keys: '#9a5322', accent: '#e59a5b', detail: '#7c4218' }, // copper
    4: { body: '#5b6470', keys: '#434b56', accent: '#8b95a3', detail: '#333a44' }, // iron
    5: { body: '#8c7a3c', keys: '#6b5d2c', accent: '#b7a45c', detail: '#544820' }, // bronze
    6: { body: '#d4a017', keys: '#a87d10', accent: '#f2c94c', detail: '#8a660c' }, // gold
    7: { body: '#c7d0dd', keys: '#9aa6b8', accent: '#eef2f7', detail: '#7c8899' }, // platinum
    8: { body: '#7dd8e8', keys: '#4fb6c9', accent: '#c9f3fa', detail: '#3795a8' }, // diamond
};

export default function TycoonMonkey({ tier = 1, typePulse = 0, celebrate = 0, className = '' }) {
    const m = MATERIALS[Math.max(1, Math.min(8, tier))] || MATERIALS[1];
    const [typing, setTyping] = useState(0);
    const [party, setParty] = useState(0);
    const first = useRef(true);
    useEffect(() => {
        if (first.current) return;
        setTyping((n) => n + 1);
    }, [typePulse]);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        setParty((n) => n + 1);
    }, [celebrate]);

    return (
        <div className={`w-full select-none ${className}`} aria-hidden="true">
            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    .twm-breathe { animation: twm-breathe 3s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
                    .twm-steam { animation: twm-steam 2.6s ease-in-out infinite; transform-box: fill-box; }
                    .twm-lamp { animation: twm-lamp 5s ease-in-out infinite; }
                    .twm-typing .twm-arms { animation: twm-strike 0.26s ease-out; transform-box: fill-box; transform-origin: 50% 0%; }
                    .twm-typing .twm-hop { animation: twm-hop 0.26s ease-out; transform-box: fill-box; }
                    .twm-typing .twm-bar { animation: twm-bar 0.26s ease-out; transform-box: fill-box; transform-origin: 50% 100%; }
                    .twm-party .twm-arms { animation: twm-cheer 0.9s ease-out; transform-box: fill-box; transform-origin: 50% 0%; }
                    .twm-party .twm-confetti { animation: twm-pop 0.9s ease-out both; transform-box: fill-box; }
                    .twm-sparkle { animation: twm-sparkle 2.4s ease-in-out infinite; }
                }
                @keyframes twm-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.02); } }
                @keyframes twm-steam { 0% { transform: translateY(0); opacity: .5; } 100% { transform: translateY(-9px); opacity: 0; } }
                @keyframes twm-lamp { 0%,100% { opacity: .85; } 50% { opacity: 1; } }
                @keyframes twm-strike { 0% { transform: rotate(0deg); } 40% { transform: rotate(7deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-hop { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-3px); } }
                @keyframes twm-bar { 0% { transform: rotate(0deg); } 35% { transform: rotate(-24deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-cheer { 0% { transform: rotate(0deg); } 30% { transform: rotate(-160deg); } 70% { transform: rotate(-150deg); } 100% { transform: rotate(0deg); } }
                @keyframes twm-pop { 0% { transform: translateY(4px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-16px); opacity: 0; } }
                @keyframes twm-sparkle { 0%,100% { opacity: .2; } 50% { opacity: .9; } }
            `}</style>
            <svg viewBox="0 0 320 190" className="h-auto w-full" role="img">
                {/* Backdrop */}
                <rect x="0" y="0" width="320" height="190" rx="16" fill="var(--surface-body)" />
                <rect x="0" y="150" width="320" height="40" rx="10" fill="color-mix(in srgb, var(--text-primary) 7%, transparent)" />
                {/* Desk */}
                <rect x="24" y="132" width="272" height="14" rx="6" fill="color-mix(in srgb, var(--text-primary) 26%, var(--surface-raised))" />
                <rect x="38" y="146" width="12" height="34" rx="3" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                <rect x="270" y="146" width="12" height="34" rx="3" fill="color-mix(in srgb, var(--text-primary) 22%, var(--surface-raised))" />
                {/* Lamp */}
                <g className="twm-lamp">
                    <rect x="262" y="96" width="5" height="38" rx="2" fill="color-mix(in srgb, var(--text-primary) 40%, transparent)" />
                    <path d="M250 96 h30 l-8 -14 h-14 z" fill="#f2c94c" stroke="color-mix(in srgb, var(--text-primary) 40%, transparent)" strokeWidth="2" />
                    <ellipse cx="264" cy="100" rx="16" ry="5" fill="#f2c94c33" />
                </g>
                {/* Mug + steam */}
                <g>
                    <rect x="52" y="116" width="18" height="17" rx="3" fill="var(--accent)" opacity="0.8" />
                    <path d="M70 121 q8 3 0 8" fill="none" stroke="var(--accent)" strokeWidth="3" opacity="0.8" />
                    <path className="twm-steam" d="M58 112 q3 -4 0 -8" fill="none" stroke="color-mix(in srgb, var(--text-primary) 35%, transparent)" strokeWidth="2" strokeLinecap="round" />
                    <path className="twm-steam" style={{ animationDelay: '-1.3s' }} d="M64 112 q-3 -4 0 -8" fill="none" stroke="color-mix(in srgb, var(--text-primary) 30%, transparent)" strokeWidth="2" strokeLinecap="round" />
                </g>
                {/* The monkey (behind the typewriter) */}
                <g key={`hop-${typing}`} className={typing ? 'twm-typing' : ''}>
                    <g className="twm-hop">
                        <g className="twm-breathe">
                            {/* tail */}
                            <path d="M118 118 q-26 4 -22 -20 q2 -12 12 -10" fill="none" stroke="#8a5a34" strokeWidth="7" strokeLinecap="round" />
                            {/* body */}
                            <ellipse cx="146" cy="106" rx="30" ry="28" fill="#a06a3d" stroke="#6d4526" strokeWidth="3" />
                            <ellipse cx="146" cy="112" rx="18" ry="16" fill="#d8ab7e" />
                            {/* head */}
                            <circle cx="146" cy="66" r="24" fill="#a06a3d" stroke="#6d4526" strokeWidth="3" />
                            <circle cx="124" cy="58" r="8" fill="#a06a3d" stroke="#6d4526" strokeWidth="3" />
                            <circle cx="168" cy="58" r="8" fill="#a06a3d" stroke="#6d4526" strokeWidth="3" />
                            <circle cx="124" cy="58" r="4" fill="#d8ab7e" />
                            <circle cx="168" cy="58" r="4" fill="#d8ab7e" />
                            <ellipse cx="146" cy="72" rx="15" ry="12" fill="#d8ab7e" />
                            <circle cx="139" cy="63" r="3.2" fill="#33261a" />
                            <circle cx="153" cy="63" r="3.2" fill="#33261a" />
                            <path d="M140 76 q6 5 12 0" fill="none" stroke="#33261a" strokeWidth="2.4" strokeLinecap="round" />
                            <ellipse cx="146" cy="70" rx="2.6" ry="1.8" fill="#6d4526" />
                        </g>
                        {/* arms over the keys */}
                        <g className="twm-arms">
                            <path d="M124 96 q-14 18 4 26" fill="none" stroke="#a06a3d" strokeWidth="9" strokeLinecap="round" />
                            <path d="M168 96 q14 18 -4 26" fill="none" stroke="#a06a3d" strokeWidth="9" strokeLinecap="round" />
                            <circle cx="128" cy="124" r="6" fill="#d8ab7e" stroke="#6d4526" strokeWidth="2" />
                            <circle cx="164" cy="124" r="6" fill="#d8ab7e" stroke="#6d4526" strokeWidth="2" />
                        </g>
                    </g>
                </g>
                {/* Celebration confetti */}
                <g key={`party-${party}`} className={party ? 'twm-party' : ''}>
                    {party > 0 && [0, 1, 2, 3, 4, 5].map((k) => (
                        <circle key={k} className="twm-confetti" cx={120 + k * 11} cy={38}
                            r="2.6" fill={['#8b5cf6', '#22d3ee', '#f2c94c', '#34d399', '#60a5fa', '#8b5cf6'][k]}
                            style={{ animationDelay: `${k * 0.05}s` }} />
                    ))}
                </g>
                {/* The typewriter — its material is the tier */}
                <g>
                    {/* paper */}
                    <g className="twm-bar" key={`paper-${typing}`}>
                        <rect x="186" y="70" width="52" height="42" rx="3" fill="var(--surface-raised)" stroke="color-mix(in srgb, var(--text-primary) 30%, transparent)" strokeWidth="2" />
                        <line x1="192" y1="80" x2="230" y2="80" stroke="color-mix(in srgb, var(--text-primary) 30%, transparent)" strokeWidth="2" />
                        <line x1="192" y1="88" x2="224" y2="88" stroke="color-mix(in srgb, var(--text-primary) 22%, transparent)" strokeWidth="2" />
                        <line x1="192" y1="96" x2="228" y2="96" stroke="color-mix(in srgb, var(--text-primary) 16%, transparent)" strokeWidth="2" />
                    </g>
                    {/* carriage + body */}
                    <rect x="176" y="104" width="74" height="10" rx="4" fill={m.detail} />
                    <rect x="180" y="110" width="66" height="24" rx="6" fill={m.body} stroke={m.detail} strokeWidth="2.5" />
                    <rect x="186" y="115" width="54" height="6" rx="3" fill={m.accent} opacity="0.85" />
                    {/* keys */}
                    {[0, 1, 2, 3, 4].map((k) => (
                        <circle key={k} cx={190 + k * 12} cy={128} r="3.4" fill={m.keys} stroke={m.detail} strokeWidth="1.4" />
                    ))}
                    {/* carriage lever */}
                    <path d="M250 106 q10 -6 12 -14" fill="none" stroke={m.detail} strokeWidth="3.4" strokeLinecap="round" />
                    {/* diamond sparkles */}
                    {tier >= 8 && (
                        <g fill="#eafcff">
                            <path className="twm-sparkle" d="M196 108 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" />
                            <path className="twm-sparkle" style={{ animationDelay: '-1.2s' }} d="M238 118 l1.6 3 3 1.6 -3 1.6 -1.6 3 -1.6 -3 -3 -1.6 3 -1.6 z" />
                        </g>
                    )}
                    {tier >= 6 && tier < 8 && (
                        <rect x="186" y="112" width="10" height="20" rx="4" fill="#ffffff2e" />
                    )}
                </g>
            </svg>
        </div>
    );
}
