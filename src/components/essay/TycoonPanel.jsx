/**
 * The Typewriter Tycoon panel, in two dress codes:
 *
 *  - Side layout (default): the game column to the RIGHT of the Memorise
 *    drill — monkey scene, wallet, shop, party roster, chat.
 *  - Game layout (`game`, fullscreen): the whole screen becomes one fixed
 *    arena — classroom of party monkeys across the top, party & chat on the
 *    left, the drill in the middle, the shop on the right. Nothing on the
 *    page scrolls; only the three columns scroll inside themselves.
 *
 * All economy math is server-side; this component reports typed-word counts
 * (batched ~700ms) and renders what the server says back.
 */
import { useEffect, useRef, useState } from 'react';
import {
    ArrowsPointingInIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserGroupIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { connectPartySocket } from '../../services/partySocket';
import { play, getMuted, setMuted } from '../../lib/tycoonSounds';
import TycoonMonkey from './TycoonMonkey';
import TycoonClassroom from './TycoonClassroom';
import { SABOTAGE_FX, SABOTAGE_META } from './sabotageFx';

const TIER_LABELS = ['Stone', 'Wood', 'Copper', 'Iron', 'Bronze', 'Gold', 'Platinum', 'Diamond'];
const TIER_DOTS = ['#8d8d8d', '#a5793f', '#c67434', '#5b6470', '#8c7a3c', '#d4a017', '#c7d0dd', '#7dd8e8'];
const SABOTAGE_EMOJI = { confetti: '🎉', snail: '🐌', ink: '🦑', jelly: '🍮', fog: '🌫️', bomb: '💣', cat: '🐈', thief: '🦹' };
const PET_EMOJI = { snailPet: '🐌', catPet: '🐈', dragonPet: '🐲' };
const SLOT_EMOJI = { head: '🎩', eyes: '🧐', body: '🤵' };

let floaterSeq = 0;
let fxSeq = 0;

function MoneyFloaters({ floaters }) {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10">
            {floaters.map((f) => (
                <span key={f.id}
                    className={`absolute animate-money-float font-mono text-sm font-extrabold ${f.tone === 'crit' ? 'text-[#d4a017] text-base' : f.tone === 'loss' ? 'text-text-error' : 'text-[color:var(--mark-green)]'}`}
                    style={{ left: `${f.x}%`, top: 44 }}>
                    {f.text}
                </span>
            ))}
        </div>
    );
}

function StreakMeter({ meter, full }) {
    const pct = Math.round((meter / Math.max(1, full)) * 100);
    return (
        <div className="flex items-center gap-2" title={`Streak meter — ${meter}/${full}. Misses shrink it.`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Streak</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
                <div className={`h-full rounded-full transition-[width] duration-300 ${pct >= 100 ? 'bg-[#d4a017]' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            {pct >= 100 && <span className="text-[10px]">⚡</span>}
        </div>
    );
}

function ShopButton({ label, sub, cost, disabled, onClick, title }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} title={title}
            className="focus-ring press flex w-full items-center justify-between gap-2 rounded-lg border border-line-soft px-2.5 py-1.5 text-left text-[11px] font-bold text-text-primary transition-colors hover:border-text-dim disabled:cursor-not-allowed disabled:opacity-45">
            <span className="min-w-0">
                <span className="block truncate">{label}</span>
                {sub && <span className="block text-[9px] font-medium text-text-dim">{sub}</span>}
            </span>
            {cost != null && <span className="shrink-0 font-mono text-[10px] text-text-dim">${cost.toLocaleString()}</span>}
        </button>
    );
}

export default function TycoonPanel({ registerReporter, game = false, onClose, onExitFullscreen, essayTitle, children }) {
    const socketRef = useRef(null);
    const [self, setSelf] = useState(null);
    const [room, setRoom] = useState(null);
    const [myId, setMyId] = useState(null);
    const [chatLog, setChatLog] = useState([]);
    const [draft, setDraft] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [goalInput, setGoalInput] = useState('200');
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [hits, setHits] = useState([]); // active incoming FX: {id, kind, wipe}
    const [floaters, setFloaters] = useState([]);
    const [typePulse, setTypePulse] = useState(0);
    const [celebrate, setCelebrate] = useState(0);
    const [muted, setMutedState] = useState(getMuted());
    const [attackTarget, setAttackTarget] = useState(null); // member id with open tray
    const [trayMsg, setTrayMsg] = useState(null); // feedback right where the attack buttons live
    const [, tickCooldowns] = useState(0); // re-render driver while a cooldown counts down
    const [adminOpen, setAdminOpen] = useState(false);
    const [adminPass, setAdminPass] = useState('');
    const [adminMoney, setAdminMoney] = useState('');
    const [memberPulses, setMemberPulses] = useState({}); // id -> bump when their words move
    const [fxList, setFxList] = useState([]); // classroom throws: {id, kind, from, to, outcome}
    const reloadUntil = useRef(0);       // my weapons reload (any target)
    const targetCoolUntil = useRef({});  // targetId -> ts their recovery ends
    const prevWords = useRef({});
    const pending = useRef({ words: 0, misses: 0, paragraphs: 0, para: 0, paraCount: 0, accuracy: 100, watching: false });
    const flushTimer = useRef(null);
    const noticeTimer = useRef(null);
    const chatEndRef = useRef(null);

    const me = self?.me || null;
    const inParty = !!room;
    const isHost = inParty && room.hostId === myId;

    const say = (text) => {
        setNotice(text);
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 2800);
    };

    const addFloater = (text, tone = 'earn') => {
        const id = `f${floaterSeq += 1}`;
        setFloaters((prev) => [...prev.slice(-7), { id, text, tone, x: 22 + ((floaterSeq * 23) % 56) }]);
        setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 950);
    };

    // ── Socket lifecycle ────────────────────────────────────────────────────
    useEffect(() => {
        const socket = connectPartySocket();
        socketRef.current = socket;
        const hello = () => socket.emit('tycoon:hello', {}, (result) => {
            if (result?.error) { setError(result.error); return; }
            setSelf(result.self);
            setMyId(result.self.me.id);
            // A layout switch remounts the panel; the server remembers the
            // party and hands the room straight back.
            if (result.snapshot) { setRoom(result.snapshot); setChatLog(result.snapshot.chat || []); }
            setError(null);
        });
        if (socket.connected) hello(); else socket.on('connect', hello);
        socket.on('party:state', (snap) => {
            // Bump a pulse for any classmate whose word count moved — that's
            // what makes their classroom monkey hammer its keys.
            setMemberPulses((prev) => {
                const next = { ...prev };
                (snap?.members || []).forEach((m) => {
                    if (prevWords.current[m.id] != null && m.words > prevWords.current[m.id]) {
                        next[m.id] = (next[m.id] || 0) + 1;
                    }
                    prevWords.current[m.id] = m.words;
                });
                return next;
            });
            setRoom(snap);
        });
        socket.on('party:chat', (message) => setChatLog((prev) => [...prev.slice(-60), message]));
        socket.on('party:fx', ({ kind, from, to, outcome }) => {
            const id = `fx${fxSeq += 1}`;
            setFxList((prev) => [...prev.slice(-6), { id, kind, from, to, outcome }]);
            setTimeout(() => setFxList((prev) => prev.filter((f) => f.id !== id)), 2600);
        });
        socket.on('party:hit', ({ kind, from, durationMs, stolen }) => {
            const id = `${kind}-${Date.now()}`;
            setHits((prev) => [...prev, { id, kind, wipe: 0 }]);
            play('boing');
            say(`${SABOTAGE_EMOJI[kind] || '💥'} ${from} hit you with ${SABOTAGE_META[kind]?.label || kind}!`);
            if (stolen) addFloater(`-$${stolen}`, 'loss');
            setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), durationMs || 6000);
        });
        socket.on('party:blocked', ({ kind, from, how, bounty }) => {
            if (how === 'absorbed') {
                play('coin');
                addFloater(`+$${bounty}`, 'crit');
                say(`🧘 Absorbed ${from}'s ${SABOTAGE_META[kind]?.label || kind} (+$${bounty})`);
            } else if (how === 'pet') {
                play('thunk');
                say(`🐈 Your desk cat chased off ${from}'s ${SABOTAGE_META[kind]?.label || kind}`);
            } else {
                play('thunk');
                say(`${how === 'shield' ? '🛡️' : '☂️'} Blocked ${from}'s ${SABOTAGE_META[kind]?.label || kind}`);
            }
        });
        socket.on('tycoon:auto', ({ earned, self: fresh }) => {
            setSelf(fresh);
            addFloater(`🐵 +$${earned}`);
        });
        socket.on('connect_error', () => setError('Could not reach the game server.'));
        return () => {
            clearTimeout(flushTimer.current);
            clearTimeout(noticeTimer.current);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // ── The drill reports in; we animate instantly and settle up in batches ─
    useEffect(() => {
        if (!registerReporter) return undefined;
        const flushSoon = () => {
            if (flushTimer.current) return;
            flushTimer.current = setTimeout(() => {
                flushTimer.current = null;
                const batch = pending.current;
                pending.current = { ...batch, words: 0, misses: 0, paragraphs: 0 };
                socketRef.current?.emit('tycoon:progress', {
                    wordsDelta: batch.words,
                    missesDelta: batch.misses,
                    paragraphsDelta: batch.paragraphs,
                    para: batch.para,
                    paraCount: batch.paraCount,
                    accuracy: batch.accuracy,
                    watching: batch.watching,
                }, (ack) => {
                    if (!ack?.ok) return;
                    setSelf(ack.self);
                    if (ack.earned > 0) {
                        addFloater(`+$${ack.earned}`, ack.crits > 0 ? 'crit' : 'earn');
                        if (ack.crits > 0) { play('jackpot'); say(`✨ CRIT ×${ack.crits} — +$${ack.jackpot}`); }
                        else if (ack.paperLump > 0) play('coin');
                    }
                });
            }, 700);
        };
        const report = (info) => {
            const p = pending.current;
            p.para = (info?.para ?? 0) + 1;
            p.paraCount = info?.paraCount ?? p.paraCount;
            p.accuracy = info?.accuracy ?? p.accuracy;
            p.watching = !!info?.watching;
            if (info?.kind === 'word') {
                p.words += 1;
                setTypePulse((n) => n + 1);
                play('clack');
                setHits((prev) => (prev.length ? prev.map((h) => ({ ...h, wipe: h.wipe + 1 })) : prev));
            } else if (info?.kind === 'miss') {
                p.misses += 1;
            } else if (info?.kind === 'paragraph') {
                p.paragraphs += 1;
                setCelebrate((n) => n + 1);
                play('ding');
            }
            flushSoon();
        };
        registerReporter(report);
        return () => registerReporter(null);
    }, [registerReporter]);

    useEffect(() => { chatEndRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [chatLog]);

    // Tick while any sabotage cooldown is live so the tray countdowns stay
    // honest; when nothing is cooling the interval sets no state at all.
    useEffect(() => {
        if (!inParty) return undefined;
        const id = setInterval(() => {
            const t = Date.now();
            if (reloadUntil.current > t || Object.values(targetCoolUntil.current).some((ts) => ts > t)) {
                tickCooldowns((n) => n + 1);
            }
        }, 500);
        return () => clearInterval(id);
    }, [inParty]);

    const ack = (result, sound) => {
        if (result?.error) { setError(result.error); return false; }
        setError(null);
        if (result?.self) setSelf(result.self);
        if (sound) play(sound);
        return true;
    };

    const buyItem = (item) => socketRef.current?.emit('tycoon:buy', { item }, (r) => {
        if (ack(r, 'kaching') && r.bought === 'tier') setCelebrate((n) => n + 1);
    });
    const createParty = () => socketRef.current?.emit('party:create', { goalWords: Number(goalInput) || 0 }, (r) => {
        if (ack(r)) { setRoom(r.snapshot); setChatLog(r.snapshot.chat || []); }
    });
    const joinParty = () => {
        const code = joinCode.toUpperCase().trim();
        if (!code) return;
        socketRef.current?.emit('party:join', { code }, (r) => {
            if (ack(r)) { setRoom(r.snapshot); setChatLog(r.snapshot.chat || []); setJoinCode(''); }
        });
    };
    const leaveParty = () => socketRef.current?.emit('party:leave', {}, () => { setRoom(null); setChatLog([]); setAttackTarget(null); });
    const togglePeace = () => socketRef.current?.emit('party:peace', { off: !room.sabotagesOff }, (r) => ack(r));
    const zap = (target, kind) => socketRef.current?.emit('party:sabotage', { target, kind }, (r) => {
        const t = Date.now();
        if (r?.error) {
            // Cooldown rejections land right in the tray, with a live countdown.
            if (r.retryInMs && r.scope === 'target') targetCoolUntil.current[target] = t + r.retryInMs;
            else if (r.retryInMs) reloadUntil.current = t + r.retryInMs;
            setTrayMsg(r.error);
            tickCooldowns((n) => n + 1);
            return;
        }
        if (!ack(r)) return;
        if (r.reloadMs) reloadUntil.current = t + r.reloadMs;
        if (r.targetCooldownMs) targetCoolUntil.current[target] = t + r.targetCooldownMs;
        setTrayMsg(null);
        tickCooldowns((n) => n + 1);
        say(r.outcome === 'hit' ? 'Direct hit!' : r.outcome === 'absorbed' ? 'They absorbed it… and kept your money.' : 'Blocked!');
    });
    const sendGift = (target, kind, preset) => socketRef.current?.emit('party:gift', { target, kind, preset }, (r) => {
        if (r?.error) { setTrayMsg(r.error); return; }
        setTrayMsg(null);
        ack(r, 'coin');
    });
    const submitAdmin = (e) => {
        e.preventDefault();
        socketRef.current?.emit('tycoon:admin', { password: adminPass, money: Number(adminMoney) }, (r) => {
            if (ack(r, 'kaching')) { setAdminOpen(false); setAdminPass(''); setAdminMoney(''); say('Wallet set.'); }
        });
    };
    const sendChat = (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        socketRef.current?.emit('party:chat', { text }, (r) => { if (r?.error) setError(r.error); });
        setDraft('');
    };
    const toggleMute = () => { const next = !muted; setMuted(next); setMutedState(next); };

    const fxOverlays = hits.map((h) => {
        const Fx = SABOTAGE_FX[h.kind];
        return Fx ? <Fx key={h.id} wipe={h.wipe} /> : null;
    });

    // ── Shared render pieces (both layouts) ─────────────────────────────────

    const walletBlock = (
        <>
            <div className="flex items-baseline justify-between">
                <button type="button" onClick={() => setAdminOpen((v) => !v)} title="Admin"
                    className="focus-ring rounded text-left">
                    <span key={me?.money} className="animate-streak-pop font-mono text-2xl font-extrabold tabular-nums text-text-primary">
                        ${me ? me.money.toLocaleString() : '…'}
                    </span>
                </button>
                <span className="text-[10px] font-bold text-text-dim">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full align-baseline" style={{ background: TIER_DOTS[me?.tierIndex ?? 0] }} />
                    {TIER_LABELS[me?.tierIndex ?? 0]} · ${me?.b ?? 1}/word
                </span>
            </div>
            {adminOpen && (
                <form onSubmit={submitAdmin} className="flex items-end gap-1.5 rounded-lg border border-line-soft bg-surface-body p-2">
                    <label className="text-[10px] font-medium text-text-dim">
                        Password
                        <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)}
                            aria-label="Admin password" className="mt-0.5 block w-20 rounded-lg px-1.5 py-1 text-xs" />
                    </label>
                    <label className="text-[10px] font-medium text-text-dim">
                        Money
                        <input type="number" min="0" max="10000000" value={adminMoney} onChange={(e) => setAdminMoney(e.target.value)}
                            aria-label="Admin money amount" className="mt-0.5 block w-24 rounded-lg px-1.5 py-1 text-xs font-bold" />
                    </label>
                    <button type="submit" className="focus-ring press rounded-lg border border-line-soft px-2 py-1.5 text-[11px] font-bold text-text-primary">
                        Set
                    </button>
                </form>
            )}
            {self && <StreakMeter meter={self.meter} full={self.meterFull} />}
            {notice && <p className="text-[11px] font-bold text-accent" role="status">{notice}</p>}
        </>
    );

    const shopBlock = self?.shop && (
        <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Shop</p>
            {self.shop.tier && (
                <ShopButton
                    label={`⌨️ ${self.shop.tier.label} typewriter`}
                    sub={`$${self.shop.tier.b}/word`}
                    cost={self.shop.tier.cost}
                    disabled={me.money < self.shop.tier.cost}
                    onClick={() => buyItem('tier')} />
            )}
            <div className="grid grid-cols-2 gap-1.5">
                <ShopButton label={`⚡ Streak ${self.up.streak}/${self.shop.streak.max}`} sub="+10% at full combo"
                    cost={self.shop.streak.cost} disabled={self.shop.streak.cost == null || me.money < self.shop.streak.cost}
                    onClick={() => buyItem('streak')} title="Streak Engine — full-combo income bonus" />
                <ShopButton label={`✨ Ribbon ${self.up.ribbon}/${self.shop.ribbon.max}`} sub="gold crit words"
                    cost={self.shop.ribbon.cost} disabled={self.shop.ribbon.cost == null || me.money < self.shop.ribbon.cost}
                    onClick={() => buyItem('ribbon')} title="Ribbon — random words pay big" />
                <ShopButton label={`📃 Paper ${self.up.paper}/${self.shop.paper.max}`} sub="paragraph bonus"
                    cost={self.shop.paper.cost} disabled={self.shop.paper.cost == null || me.money < self.shop.paper.cost}
                    onClick={() => buyItem('paper')} title="Paper Feed — lump sum per finished paragraph" />
                <ShopButton label={`🛡️ Shield ×${self.shop.shield.held}`} sub="blocks one hit"
                    cost={self.shop.shield.cost} disabled={self.shop.shield.held >= self.shop.shield.max || me.money < self.shop.shield.cost}
                    onClick={() => buyItem('shield')} />
                <ShopButton label={self.shop.wipers.owned ? '🧹 Wipers ✓' : '🧹 Wipers'} sub="halves hit durations"
                    cost={self.shop.wipers.owned ? null : self.shop.wipers.cost}
                    disabled={self.shop.wipers.owned || me.money < self.shop.wipers.cost}
                    onClick={() => buyItem('wipers')} />
                <ShopButton label={self.shop.umbrella.owned ? '☂️ Umbrella ✓' : '☂️ Umbrella'} sub="auto-blocks cheap hits"
                    cost={self.shop.umbrella.owned ? null : self.shop.umbrella.cost}
                    disabled={self.shop.umbrella.owned || me.money < self.shop.umbrella.cost}
                    onClick={() => buyItem('umbrella')} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {self.shop.pets.map((pet) => (
                    <ShopButton key={pet.key} label={`${PET_EMOJI[pet.key]} ${pet.owned ? '✓' : ''}`}
                        cost={pet.owned ? null : pet.cost}
                        disabled={pet.owned || me.money < pet.cost}
                        onClick={() => buyItem(pet.key)}
                        title={pet.perk ? `${pet.label} — ${pet.perk}` : pet.label} />
                ))}
            </div>
            {self.shop.autos && (
                <>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-text-dim">Staff</p>
                    <ShopButton label={`🐵 Automonkey ×${self.shop.autos.count}/${self.shop.autos.max}`}
                        sub="a dumb helper that slowly earns while you study"
                        cost={self.shop.autos.count >= self.shop.autos.max ? null : self.shop.autos.cost}
                        disabled={self.shop.autos.count >= self.shop.autos.max || me.money < self.shop.autos.cost}
                        onClick={() => buyItem('auto')}
                        title="Ten together earn half of steady typing — never more" />
                    <ShopButton label={self.shop.robo.owned ? '🤖 Robo monkey ✓' : '🤖 Robo monkey'}
                        sub="works like three automonkeys"
                        cost={self.shop.robo.owned ? null : self.shop.robo.cost}
                        disabled={self.shop.robo.owned || me.money < self.shop.robo.cost}
                        onClick={() => buyItem('robo')} />
                </>
            )}
            {self.shop.wardrobe && (
                <>
                    <p className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-text-dim">
                        Wardrobe {self.shop.sophisticated && <span className="normal-case tracking-normal text-[#d4a017]">🎩 sophisticated</span>}
                    </p>
                    {self.shop.wardrobe.map((line) => (
                        <ShopButton key={line.slot}
                            label={`${SLOT_EMOJI[line.slot]} ${line.label} ${line.level}/${line.max}${line.current ? ` · ${line.current}` : ''}`}
                            sub={line.next ? `next: ${line.next.label} — ${line.next.perk}` : 'as sophisticated as it gets'}
                            cost={line.next ? line.next.cost : null}
                            disabled={!line.next || me.money < line.next.cost}
                            onClick={() => buyItem(`acc:${line.slot}`)} />
                    ))}
                </>
            )}
        </div>
    );

    const trayFor = (m) => {
        if (!self?.shop) return null;
        const t = Date.now();
        const coolLeftMs = Math.max(reloadUntil.current - t, (targetCoolUntil.current[m.id] || 0) - t, 0);
        const coolLeft = Math.ceil(coolLeftMs / 1000);
        return (
            <div className="mt-1.5 border-t border-line-soft pt-1.5">
                <div className="flex flex-wrap items-center gap-1">
                    {coolLeft > 0 && (
                        <span className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[9px] font-extrabold tabular-nums text-text-dim" role="timer">
                            ⏳{coolLeft}s
                        </span>
                    )}
                    {self.shop.sabotages.map((s) => (
                        <button key={s.key} type="button" title={`${s.label} — $${s.cost}`}
                            disabled={room?.sabotagesOff || me.money < s.cost || coolLeft > 0}
                            onClick={() => zap(m.id, s.key)}
                            className="focus-ring press rounded border border-line-soft px-1.5 py-0.5 text-[11px] disabled:opacity-40">
                            {SABOTAGE_EMOJI[s.key]}<span className="ml-0.5 font-mono text-[8px] text-text-dim">${s.cost}</span>
                        </button>
                    ))}
                    <span className="mx-1 w-px bg-line-soft" aria-hidden="true" />
                    {[0, 1, 2].map((preset) => {
                        const giftCost = [10, 25, 50][preset] * (me?.b || 1);
                        return (
                            <button key={preset} type="button" title={`Send them $${giftCost} of your money`}
                                disabled={me.money < giftCost}
                                onClick={() => sendGift(m.id, 'cash', preset)}
                                className="focus-ring press rounded border border-line-soft px-1.5 py-0.5 text-[9px] font-bold text-text-dim hover:text-text-primary disabled:opacity-40">
                                💸${giftCost}
                            </button>
                        );
                    })}
                    <button type="button" title="Give one of your shields" disabled={!self || (self.shop.shield.held < 1)}
                        onClick={() => sendGift(m.id, 'shield')}
                        className="focus-ring press rounded border border-line-soft px-1.5 py-0.5 text-[9px] font-bold text-text-dim hover:text-text-primary disabled:opacity-40">
                        🛡️→
                    </button>
                </div>
                {trayMsg && <p className="mt-1 text-[10px] font-bold text-text-dim" role="status">{trayMsg}</p>}
            </div>
        );
    };

    const partyHeader = (
        <p className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-text-dim">
            <UserGroupIcon className="h-3.5 w-3.5" aria-hidden="true" /> Party
            {inParty && (
                <button type="button" title="Click to copy the code"
                    onClick={() => navigator.clipboard?.writeText(room.code).then(() => say('Code copied'))}
                    className="focus-ring rounded border border-line-soft px-1.5 py-0.5 font-mono text-[10px] font-extrabold tracking-[0.2em] text-accent">
                    {room.code}
                </button>
            )}
            {inParty && room.goalWords > 0 && <span className="normal-case tracking-normal">goal {room.goalWords}</span>}
            {inParty && room.sabotagesOff && <span className="normal-case tracking-normal">🕊️ peace</span>}
            {inParty && (
                <button type="button" onClick={leaveParty} className="focus-ring ml-auto text-[10px] font-bold normal-case tracking-normal text-text-dim hover:text-text-primary">
                    Leave
                </button>
            )}
        </p>
    );

    const joinBlock = !inParty && (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-1.5">
                <label className="text-[10px] font-medium text-text-dim">
                    Goal
                    <input type="number" min="0" max="5000" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                        className="mt-0.5 block w-16 rounded-lg px-1.5 py-1 text-xs font-bold" />
                </label>
                <button type="button" onClick={createParty}
                    className="focus-ring press rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-bold text-white">
                    Open party
                </button>
                <form className="ml-auto flex items-end gap-1.5" onSubmit={(e) => { e.preventDefault(); joinParty(); }}>
                    <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={8} placeholder="CODE" aria-label="Party code"
                        className="w-20 rounded-lg px-1.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.15em]" />
                    <button type="submit" className="focus-ring press rounded-lg border border-line-soft px-2 py-1.5 text-[11px] font-bold text-text-primary">
                        Join
                    </button>
                </form>
            </div>
            <p className="text-[10px] leading-relaxed text-text-muted">
                Friends see your race live. Typed words earn; watching earns nothing but absorbs attacks. Chat is never saved.
            </p>
        </div>
    );

    const chatBlock = inParty && (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-line-soft bg-surface-body p-2">
            <div className={`flex flex-col gap-0.5 overflow-y-auto text-[11px] ${game ? 'min-h-0 flex-1' : 'max-h-32 min-h-[4.5rem]'}`}>
                {chatLog.map((msg) => (
                    <p key={msg.id} className={msg.system ? 'italic text-text-dim' : 'text-text-primary'}>
                        {!msg.system && <strong>{msg.from}: </strong>}{msg.text}
                    </p>
                ))}
                <span ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="mt-1.5 flex gap-1">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={240}
                    aria-label="Party chat message" placeholder="Say something… (not saved)"
                    className="min-w-0 flex-1 rounded-lg px-2 py-1 text-[11px]" />
                <button type="submit" className="focus-ring press rounded-lg bg-accent px-2 py-1 text-[11px] font-bold text-white">Send</button>
            </form>
        </div>
    );

    // ── Game layout: the fixed fullscreen arena ─────────────────────────────
    if (game) {
        const classmates = room?.members?.length ? room.members : (me ? [me] : []);
        const pulses = { ...memberPulses, ...(myId ? { [myId]: typePulse } : {}) };
        const selected = inParty ? room.members.find((m) => m.id === attackTarget && m.id !== myId) : null;
        return (
            <div className="flex h-full min-h-0 flex-col bg-surface-body">
                {fxOverlays}
                {/* top bar — one slim line */}
                <div className="flex h-8 shrink-0 items-center gap-2.5 border-b border-line-soft px-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-dim">🕹️ Tycoon</span>
                    {essayTitle && <span className="truncate text-[11px] font-medium text-text-dim">{essayTitle}</span>}
                    {error && <span className="truncate text-[10px] font-bold text-text-error" role="alert">{error}</span>}
                    <span className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
                            className="focus-ring rounded p-0.5 text-text-dim transition-colors hover:text-text-primary">
                            {muted ? <SpeakerXMarkIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <SpeakerWaveIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                        {onExitFullscreen && (
                            <button type="button" onClick={onExitFullscreen}
                                className="focus-ring press inline-flex items-center gap-1 rounded-md border border-line-soft px-1.5 py-0.5 text-[10px] font-bold text-text-dim hover:text-text-primary">
                                <ArrowsPointingInIcon className="h-3 w-3" aria-hidden="true" /> Exit game
                            </button>
                        )}
                    </span>
                </div>
                {/* the classroom */}
                <div className="relative h-[32%] min-h-40 shrink-0 border-b border-line-soft">
                    <MoneyFloaters floaters={floaters} />
                    <TycoonClassroom members={classmates} myId={myId} pulses={pulses} fx={fxList}
                        selectedTarget={attackTarget} onPickTarget={(id) => setAttackTarget((cur) => (cur === id ? null : id))}
                        code={room?.code} goalWords={room?.goalWords} />
                </div>
                {/* three fixed columns; each scrolls inside itself */}
                <div className="flex min-h-0 flex-1">
                    <aside className="flex w-72 shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-line-soft p-3">
                        {/* The drill's settings portal in here — left side, like a control deck. */}
                        <div id="tycoon-settings-slot" className="flex flex-col gap-2.5 rounded-lg border border-line-soft bg-surface-raised p-2.5 empty:hidden" />
                        {partyHeader}
                        {joinBlock}
                        {inParty && isHost && (
                            <button type="button" onClick={togglePeace}
                                className="focus-ring w-fit rounded-lg border border-line-soft px-2 py-1 text-[10px] font-bold text-text-dim hover:text-text-primary">
                                {room.sabotagesOff ? '⚔️ Allow sabotage' : '🕊️ Declare peace'}
                            </button>
                        )}
                        {inParty && (selected ? (
                            <div className="rounded-lg border border-line-soft bg-surface-raised p-2">
                                <p className="flex items-center justify-between text-[10px] font-bold text-text-primary">
                                    ⚔️ {selected.name}
                                    <button type="button" onClick={() => setAttackTarget(null)} aria-label="Close attack tray"
                                        className="focus-ring rounded p-0.5 text-text-dim hover:text-text-primary">
                                        <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                </p>
                                {trayFor(selected)}
                            </div>
                        ) : (
                            <p className="text-[10px] leading-relaxed text-text-muted">
                                Click a classmate's desk up there to send them a sabotage — or a gift.
                            </p>
                        ))}
                        {chatBlock}
                    </aside>
                    <main className="min-w-0 flex-1 overflow-y-auto">
                        <div className="flex min-h-full flex-col justify-center px-6 py-4">{children}</div>
                    </main>
                    <aside className="flex w-80 shrink-0 flex-col gap-2.5 overflow-y-auto border-l border-line-soft p-3">
                        {walletBlock}
                        {shopBlock}
                    </aside>
                </div>
            </div>
        );
    }

    // ── Side layout: the column beside the drill ────────────────────────────
    return (
        <>
            {fxOverlays}
            <div className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-surface-raised p-4 shadow-card">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Typewriter tycoon</p>
                    <span className="flex items-center gap-1">
                        <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
                            className="focus-ring rounded p-1 text-text-dim transition-colors hover:text-text-primary">
                            {muted ? <SpeakerXMarkIcon className="h-4 w-4" aria-hidden="true" /> : <SpeakerWaveIcon className="h-4 w-4" aria-hidden="true" />}
                        </button>
                        {onClose && (
                            <button type="button" onClick={onClose} aria-label="Turn gamify off"
                                className="focus-ring rounded p-1 text-text-dim transition-colors hover:text-text-primary">
                                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </span>
                </div>

                {error && <p className="text-[11px] font-bold text-text-error" role="alert">{error}</p>}

                {/* The scene: monkey, money, floaters */}
                <div className="relative">
                    <MoneyFloaters floaters={floaters} />
                    <TycoonMonkey tier={(me?.tierIndex ?? 0) + 1} typePulse={typePulse} celebrate={celebrate} />
                    {me?.pets?.length > 0 && (
                        <div className="pointer-events-none absolute bottom-1 right-2 flex gap-1 text-sm" aria-hidden="true">
                            {me.pets.map((p) => <span key={p}>{PET_EMOJI[p]}</span>)}
                        </div>
                    )}
                </div>
                {walletBlock}
                {shopBlock}

                {/* Party */}
                <div className="border-t border-line-soft pt-3">
                    {partyHeader}
                    {joinBlock}
                    {inParty && (
                        <div className="flex flex-col gap-2">
                            {isHost && (
                                <button type="button" onClick={togglePeace}
                                    className="focus-ring w-fit rounded-lg border border-line-soft px-2 py-1 text-[10px] font-bold text-text-dim hover:text-text-primary">
                                    {room.sabotagesOff ? '⚔️ Allow sabotage' : '🕊️ Declare peace'}
                                </button>
                            )}
                            <ul className="flex flex-col gap-1.5">
                                {room.members.map((m) => {
                                    const mine = m.id === myId;
                                    const target = room.goalWords > 0 ? room.goalWords : Math.max(40, ...room.members.map((x) => x.words));
                                    const pct = Math.min(100, Math.round((m.words / Math.max(1, target)) * 100));
                                    const trayOpen = attackTarget === m.id;
                                    return (
                                        <li key={m.id} className="rounded-lg border border-line-soft bg-surface-body px-2 py-1.5">
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_DOTS[m.tierIndex] }} title={TIER_LABELS[m.tierIndex]} />
                                                <span className={`truncate font-bold ${m.connected ? 'text-text-primary' : 'text-text-dim line-through'}`}>
                                                    {m.goalHit && '🏆'}{m.sophisticated && '🎩'}{m.watching && '🧘'}{m.name}{mine && <span className="font-medium text-text-dim"> · you</span>}
                                                </span>
                                                <span className="ml-auto font-mono text-[10px] font-extrabold tabular-nums text-text-primary">${m.money.toLocaleString()}</span>
                                                {m.shields > 0 && <span className="text-[9px]">{'🛡️'.repeat(m.shields)}</span>}
                                                {!mine && (
                                                    <button type="button" aria-expanded={trayOpen} aria-label={`Interact with ${m.name}`}
                                                        onClick={() => setAttackTarget(trayOpen ? null : m.id)}
                                                        className="focus-ring rounded border border-line-soft px-1 text-[10px] font-bold hover:border-text-dim">
                                                        ⚔️
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-soft">
                                                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="mt-0.5 text-[9px] font-bold tabular-nums text-text-dim">
                                                {m.words}w{room.goalWords > 0 ? `/${room.goalWords}` : ''} · ¶{m.para}/{m.paraCount || '?'} · {m.accuracy}%
                                            </p>
                                            {trayOpen && trayFor(m)}
                                        </li>
                                    );
                                })}
                            </ul>
                            {chatBlock}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
