/**
 * Study Party — memorise together. Open a party, share the 6-letter code,
 * and everyone drills their own essay while the roster shows the race:
 * words landed, paragraph, accuracy — plus the tycoon layer. Every word you
 * TYPE (watched words never pay) earns money; money buys word-value
 * upgrades, shields, gifts to teammates, and sabotage — ink across someone's
 * screen or a bomb that blurs their world for a few seconds. Chat rides the
 * socket and lives only in the party's server memory: close the party and
 * it is gone.
 *
 * The component registers a reporter with the Memorise drill (via
 * registerReporter) so landed words stream in, batched onto the socket.
 * It also renders the money chip and the incoming-sabotage overlays as
 * fixed layers, INSIDE the fullscreen practice container so they show in
 * Focus/Trance/Party scenes too.
 */
import { useEffect, useRef, useState } from 'react';
import { UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { connectPartySocket } from '../../services/partySocket';

const SABOTAGE_BUTTONS = [
  { kind: 'ink', label: '🦑 $25', title: 'Ink their screen ($25)' },
  { kind: 'bomb', label: '💣 $45', title: 'Blur-bomb them ($45)' },
];

/** Big ink blobs sliding down the victim's screen. Deterministic layout. */
function InkOverlay() {
  const blobs = [
    { left: '12%', top: '6%', size: 'h-48 w-56', delay: '0s' },
    { left: '55%', top: '2%', size: 'h-64 w-72', delay: '0.12s' },
    { left: '30%', top: '38%', size: 'h-72 w-80', delay: '0.05s' },
    { left: '72%', top: '48%', size: 'h-52 w-60', delay: '0.2s' },
    { left: '5%', top: '58%', size: 'h-56 w-64', delay: '0.16s' },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85]">
      {blobs.map((b, i) => (
        <span key={i}
          className={`absolute ${b.size} animate-ink-splat rounded-[48%_52%_55%_45%/55%_45%_52%_48%] bg-[#14161f]`}
          style={{ left: b.left, top: b.top, animationDelay: b.delay }} />
      ))}
    </div>
  );
}

/** The bomb: one 💥 and a heavy blur while the smoke clears. */
function BombOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85] animate-bomb-smoke"
      style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl">💥</span>
    </div>
  );
}

export default function StudyParty({ registerReporter }) {
  const socketRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [myId, setMyId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [goalInput, setGoalInput] = useState('200');
  const [chatLog, setChatLog] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [hits, setHits] = useState([]); // active incoming sabotage effects
  const [open, setOpen] = useState(true);
  const pending = useRef({ words: 0, para: 0, paraCount: 0, accuracy: 100 });
  const flushTimer = useRef(null);
  const chatEndRef = useRef(null);
  const noticeTimer = useRef(null);

  const inParty = !!snapshot;
  const me = snapshot?.members.find((m) => m.id === myId) || null;

  const say = (text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };

  const ensureSocket = () => {
    if (socketRef.current) return socketRef.current;
    const socket = connectPartySocket();
    socketRef.current = socket;
    socket.on('party:state', (snap) => {
      setSnapshot(snap);
      setChatLog((prev) => (prev.length ? prev : snap.chat || []));
    });
    socket.on('party:chat', (message) => {
      setChatLog((prev) => [...prev.slice(-60), message]);
    });
    socket.on('party:hit', ({ kind, from, durationMs }) => {
      const id = `${kind}-${Date.now()}`;
      setHits((prev) => [...prev, { id, kind }]);
      say(kind === 'ink' ? `🦑 ${from} inked you!` : `💣 ${from} bombed you!`);
      setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), durationMs || 6000);
    });
    socket.on('party:shielded', ({ kind, from }) => {
      say(`🛡️ Your shield ate ${from}'s ${kind}`);
    });
    socket.on('connect_error', () => setError('Could not reach the party server.'));
    return socket;
  };

  const teardown = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSnapshot(null);
    setChatLog([]);
    setHits([]);
    setMyId(null);
  };

  useEffect(() => () => {
    clearTimeout(flushTimer.current);
    clearTimeout(noticeTimer.current);
    socketRef.current?.disconnect();
  }, []);

  // The drill hands us every landed (typed, not watched) word; batch them
  // onto the wire so a fast typist is one message per ~800ms, not per word.
  useEffect(() => {
    if (!registerReporter) return undefined;
    const report = (info) => {
      if (!socketRef.current || !snapshot) return;
      pending.current.words += 1;
      pending.current.para = (info?.para ?? 0) + 1;
      pending.current.paraCount = info?.paraCount ?? 0;
      pending.current.accuracy = info?.accuracy ?? 100;
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        const batch = pending.current;
        pending.current = { ...batch, words: 0 };
        socketRef.current?.emit('party:progress', {
          wordsDelta: batch.words,
          para: batch.para,
          paraCount: batch.paraCount,
          accuracy: batch.accuracy,
        });
      }, 800);
    };
    registerReporter(report);
    return () => registerReporter(null);
  }, [registerReporter, snapshot]);

  const handleAck = (result, okMessage) => {
    if (result?.error) setError(result.error);
    else {
      setError(null);
      if (result?.snapshot) setSnapshot(result.snapshot);
      if (okMessage) say(okMessage);
    }
  };

  const createParty = () => {
    const socket = ensureSocket();
    const start = () => socket.emit('party:create', { goalWords: Number(goalInput) || 0 }, (result) => {
      if (result?.ok) {
        setMyId(String(result.you));
        setChatLog(result.snapshot.chat || []);
      }
      handleAck(result);
    });
    if (socket.connected) start(); else socket.once('connect', start);
  };

  const joinParty = () => {
    const code = joinCode.toUpperCase().trim();
    if (!code) return;
    const socket = ensureSocket();
    const start = () => socket.emit('party:join', { code }, (result) => {
      if (result?.ok) {
        setMyId(String(result.you));
        setChatLog(result.snapshot.chat || []);
      }
      handleAck(result);
    });
    if (socket.connected) start(); else socket.once('connect', start);
  };

  const leave = () => {
    socketRef.current?.emit('party:leave', {}, () => {});
    teardown();
  };

  const sendChat = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socketRef.current?.emit('party:chat', { text }, (r) => { if (r?.error) setError(r.error); });
    setDraft('');
  };

  const buy = (item) => socketRef.current?.emit('party:buy', { item }, (r) => handleAck(r, item === 'rate' ? 'Word value up!' : 'Shield up'));
  const zap = (target, kind) => socketRef.current?.emit('party:sabotage', { target, kind }, (r) => handleAck(r));
  const sendGift = (target) => socketRef.current?.emit('party:gift', { target, amount: 10 }, (r) => handleAck(r, 'Sent $10'));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [chatLog]);

  const rateCost = me ? Math.round(40 * (2.2 ** me.rateLevel)) : 40;

  return (
    <>
      {/* Incoming sabotage — rendered no matter what scene is running. */}
      {hits.map((h) => (h.kind === 'ink' ? <InkOverlay key={h.id} /> : <BombOverlay key={h.id} />))}

      {/* Wallet chip: always visible while partying, scenes included. */}
      {inParty && me && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[74] flex items-center gap-2 rounded-xl border border-line-soft bg-surface-raised/95 px-3 py-1.5 shadow-pop">
          <span className="font-mono text-sm font-extrabold tabular-nums text-text-primary">${me.money}</span>
          <span className="text-[10px] font-bold text-text-dim">${me.wordValue}/word</span>
          {me.shields > 0 && <span className="text-[10px]">{'🛡️'.repeat(me.shields)}</span>}
          {notice && <span className="text-[10px] font-bold text-accent">{notice}</span>}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-line-soft bg-surface-raised p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">
            <UserGroupIcon className="h-4 w-4" aria-hidden="true" /> Study party
            {inParty && (
              <button type="button" title="Click to copy the code"
                onClick={() => navigator.clipboard?.writeText(snapshot.code).then(() => say('Code copied'))}
                className="focus-ring rounded-lg border border-line-soft px-2 py-0.5 font-mono text-xs font-extrabold tracking-[0.2em] text-accent">
                {snapshot.code}
              </button>
            )}
            {inParty && snapshot.goalWords > 0 && (
              <span className="normal-case tracking-normal">goal {snapshot.goalWords} words</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {inParty ? (
              <button type="button" onClick={leave}
                className="focus-ring press inline-flex items-center gap-1 rounded-lg border border-line-soft px-2.5 py-1 text-xs font-bold text-text-dim hover:text-text-primary">
                <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" /> Leave
              </button>
            ) : (
              <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
                className="focus-ring text-xs font-bold text-text-dim hover:text-text-primary">
                {open ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
        </div>

        {error && <p className="mt-2 text-xs font-bold text-text-error" role="alert">{error}</p>}

        {!inParty && open && (
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="flex items-end gap-2">
              <label className="text-xs font-medium text-text-dim">
                Word goal
                <input type="number" min="0" max="5000" value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="mt-1 block w-24 rounded-lg px-2 py-1.5 text-sm font-bold" />
              </label>
              <button type="button" onClick={createParty}
                className="focus-ring press rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white">
                Open a party
              </button>
            </div>
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); joinParty(); }}>
              <label className="text-xs font-medium text-text-dim">
                Have a code?
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8} placeholder="ABC123" aria-label="Party code"
                  className="mt-1 block w-28 rounded-lg px-2 py-1.5 font-mono text-sm font-bold tracking-[0.2em]" />
              </label>
              <button type="submit"
                className="focus-ring press rounded-xl border border-line-soft px-3.5 py-2 text-xs font-bold text-text-primary">
                Join
              </button>
            </form>
            <p className="basis-full text-xs text-text-muted">
              Everyone drills their own essay; the party shares the race. Typed words earn money — upgrades,
              gifts and sabotage are all on the table. Chat is never saved.
            </p>
          </div>
        )}

        {inParty && (
          <div className="mt-4 grid gap-5 md:grid-cols-[1fr,260px]">
            <div>
              {/* The roster: the race, the wallets, and the weapons. */}
              <ul className="flex flex-col gap-2.5">
                {snapshot.members.map((m) => {
                  const isMe = m.id === myId;
                  const target = snapshot.goalWords > 0 ? snapshot.goalWords : Math.max(40, ...snapshot.members.map((x) => x.words));
                  const pct = Math.min(100, Math.round((m.words / Math.max(1, target)) * 100));
                  return (
                    <li key={m.id} className="rounded-xl border border-line-soft bg-surface-body px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${m.connected ? 'text-text-primary' : 'text-text-dim line-through'}`}>
                          {m.goalHit && '🏆 '}{m.name}{isMe && <span className="text-text-dim"> · you</span>}
                        </span>
                        <span className="text-text-dim tabular-nums">¶{m.para}/{m.paraCount || '?'} · {m.accuracy}%</span>
                        <span className="ml-auto font-mono font-extrabold tabular-nums text-text-primary">${m.money}</span>
                        {m.shields > 0 && <span>{'🛡️'.repeat(m.shields)}</span>}
                        {!isMe && (
                          <span className="flex gap-1">
                            {SABOTAGE_BUTTONS.map((s) => (
                              <button key={s.kind} type="button" title={s.title}
                                onClick={() => zap(m.id, s.kind)}
                                className="focus-ring press rounded-lg border border-line-soft px-1.5 py-0.5 text-[10px] font-bold hover:border-text-dim">
                                {s.label}
                              </button>
                            ))}
                            <button type="button" title="Send them $10" onClick={() => sendGift(m.id)}
                              className="focus-ring press rounded-lg border border-line-soft px-1.5 py-0.5 text-[10px] font-bold hover:border-text-dim">
                              💸 $10
                            </button>
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-text-dim tabular-nums">
                        {m.words} words{snapshot.goalWords > 0 ? ` / ${snapshot.goalWords}` : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {/* The shop. */}
              {me && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Shop</span>
                  <button type="button" onClick={() => buy('rate')}
                    className="focus-ring press rounded-lg border border-line-soft px-2.5 py-1 text-[11px] font-bold hover:border-text-dim">
                    ⬆️ Word value +$1 — ${rateCost}
                  </button>
                  <button type="button" onClick={() => buy('shield')}
                    className="focus-ring press rounded-lg border border-line-soft px-2.5 py-1 text-[11px] font-bold hover:border-text-dim">
                    🛡️ Shield — $30
                  </button>
                </div>
              )}
            </div>

            {/* Chat: relayed live, buffered briefly server-side, never saved. */}
            <div className="flex flex-col rounded-xl border border-line-soft bg-surface-body p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">Party chat · not saved</p>
              <div className="flex max-h-44 min-h-[8rem] flex-1 flex-col gap-1 overflow-y-auto text-xs">
                {chatLog.map((msg) => (
                  <p key={msg.id} className={msg.system ? 'italic text-text-dim' : 'text-text-primary'}>
                    {!msg.system && <strong>{msg.from}: </strong>}{msg.text}
                  </p>
                ))}
                <span ref={chatEndRef} />
              </div>
              <form onSubmit={sendChat} className="mt-2 flex gap-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={240}
                  aria-label="Party chat message" placeholder="Say something…"
                  className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs" />
                <button type="submit" className="focus-ring press rounded-lg bg-accent px-2.5 py-1.5 text-xs font-bold text-white">
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
