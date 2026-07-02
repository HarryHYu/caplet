import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { connectParticipantSocket } from '../../services/liveSocket';
import SlideRenderer from '../../components/lesson/SlideRenderer';
import MathText from '../../components/MathText';
import AnimatedLeaderboard from '../../components/live/AnimatedLeaderboard';
import Podium from '../../components/live/Podium';
import useCountUp from '../../lib/useCountUp';
import { fireCelebration } from '../../lib/confetti';

/* ──────────────────────────────────────────────────────────────────────────
   Shared bits
   ────────────────────────────────────────────────────────────────────────── */

function useCountdown(opensAt, windowMs) {
  const [remainingMs, setRemainingMs] = useState(null);
  useEffect(() => {
    if (!opensAt || !windowMs) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, opensAt + windowMs - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [opensAt, windowMs]);
  return remainingMs;
}

function TimerBar({ opensAt, windowMs }) {
  const remainingMs = useCountdown(opensAt, windowMs);
  if (remainingMs == null || !windowMs) return null;
  const pct = Math.max(0, Math.min(100, (remainingMs / windowMs) * 100));
  const seconds = Math.ceil(remainingMs / 1000);
  const low = pct < 25;
  return (
    <div>
      <div className="h-2.5 w-full rounded-full bg-surface-soft overflow-hidden">
        <Motion.div
          className={`h-full rounded-full ${low ? 'bg-rose-500' : pct < 55 ? 'bg-amber-400' : 'bg-accent'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.12, ease: 'linear' }}
        />
      </div>
      <Motion.p
        key={seconds}
        initial={{ scale: low ? 1.35 : 1.1, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`text-center text-xs font-bold mt-1.5 tabular-nums ${low ? 'text-rose-500' : 'text-text-dim'}`}
      >
        {seconds}s
      </Motion.p>
    </div>
  );
}

/** Big bouncy checkmark/cross + count-up points + streak badge, shared by the
    immediate answer ack and the round-reveal moment. */
function AnswerCelebration({ correct, pointsAwarded, streakBonus, streak, rank }) {
  const points = useCountUp(pointsAwarded ?? 0, 800);
  const firedRef = useRef(false);
  useEffect(() => {
    if (correct && !firedRef.current) {
      firedRef.current = true;
      fireCelebration();
    }
  }, [correct]);

  return (
    <div className="text-center py-10">
      <Motion.div
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4 ${
          correct ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
        }`}
      >
        {correct ? '✓' : '✕'}
      </Motion.div>
      <Motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={`text-3xl font-display font-extrabold mb-2 ${correct ? 'text-emerald-500' : 'text-rose-500'}`}
      >
        {correct ? 'Correct!' : 'Not quite'}
      </Motion.p>
      <Motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-text-muted tabular-nums"
      >
        +{points} points{rank ? ` · rank #${rank}` : ''}
      </Motion.p>
      <AnimatePresence>
        {streak >= 2 && (
          <Motion.div
            initial={{ scale: 0, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 380, damping: 15 }}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 font-bold text-sm"
          >
            🔥 {streak} in a row!{streakBonus > 0 ? ` · +${streakBonus} streak bonus` : ''}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function shuffleArray(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ──────────────────────────────────────────────────────────────────────────
   Per-type live question components. Each renders the sanitized publicSlide
   the server sent (no answer key), calls `onAnswer(response)` once, and then
   shows a "locked in" state until the round-level result comes back.
   ────────────────────────────────────────────────────────────────────────── */

function LiveChoice({ slide, onAnswer, locked }) {
  const [selected, setSelected] = useState(() => new Set());
  const multi = slide.mode === 'multiple';

  const toggle = (i) => {
    if (locked) return;
    setSelected((prev) => {
      const next = new Set(multi ? prev : []);
      if (multi && prev.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-display font-bold leading-snug text-text-primary mb-5">
        <MathText>{slide.question}</MathText>
      </h2>
      <div className="space-y-2">
        {(slide.options || []).map((option, i) => {
          const chosen = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => toggle(i)}
              className={`group w-full text-left px-4 py-3.5 border rounded-xl transition-all flex items-center gap-3 ${
                chosen ? 'border-accent bg-accent/[0.08]' : 'border-line-soft hover:border-accent/60 hover:bg-accent/5'
              } disabled:opacity-70`}
            >
              <span className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                chosen ? 'border-accent text-accent bg-accent/10' : 'border-line-soft text-text-dim'
              }`}>
                {slide.mode === 'truefalse' ? option.charAt(0).toUpperCase() : String.fromCharCode(65 + i)}
              </span>
              <span className="text-[15px] flex-1"><MathText>{option}</MathText></span>
            </button>
          );
        })}
      </div>
      {!locked && (
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => onAnswer([...selected])}
          className="btn-primary w-full mt-4 py-3 disabled:opacity-50"
        >
          Submit answer
        </button>
      )}
    </div>
  );
}

// When a {{blank}} sits inside a $...$/$$...$$ math span, splitting the
// template on the blank marker leaves each half with an unbalanced $
// delimiter and KaTeX renders garbage. Mirrors SlideRenderer.jsx's
// sanitizeFillBlankTemplate — strip the delimiters from any math span that
// contains a blank so the surrounding punctuation just renders as plain text.
function sanitizeFillBlankTemplate(template) {
  let t = template;
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => (/\{\{\d+\}\}/.test(inner) ? inner : match));
  t = t.replace(/\$([^$\n]+?)\$/g, (match, inner) => (/\{\{\d+\}\}/.test(inner) ? inner : match));
  return t;
}

function LiveFillBlank({ slide, onAnswer, locked }) {
  const [answers, setAnswers] = useState(() => new Array(slide.blanks?.length || 0).fill(''));
  const parts = useMemo(() => {
    const template = sanitizeFillBlankTemplate(slide.template || '');
    const out = [];
    const regex = /\{\{(\d+)\}\}/g;
    let last = 0;
    let m;
    while ((m = regex.exec(template)) !== null) {
      if (m.index > last) out.push({ text: template.slice(last, m.index) });
      out.push({ blank: Number(m[1]) });
      last = m.index + m[0].length;
    }
    if (last < template.length) out.push({ text: template.slice(last) });
    return out;
  }, [slide.template]);

  return (
    <div>
      <div className="text-lg md:text-xl leading-loose text-text-primary font-serif mb-5">
        {parts.map((p, i) => {
          if (p.text) return <MathText key={i}>{p.text}</MathText>;
          const idx = p.blank;
          const blank = slide.blanks?.[idx];
          if (!blank) return null;
          if (blank.options?.length) {
            return (
              <select
                key={i}
                disabled={locked}
                value={answers[idx] || ''}
                onChange={(e) => setAnswers((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                className="inline-block mx-1 px-2 py-1 rounded-lg border border-accent/40 bg-surface-raised text-text-primary text-base"
              >
                <option value="" disabled>choose…</option>
                {blank.options.map((o, oi) => <option key={oi} value={o}>{o}</option>)}
              </select>
            );
          }
          return (
            <input
              key={i}
              type="text"
              disabled={locked}
              value={answers[idx] || ''}
              onChange={(e) => setAnswers((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
              className="inline-block mx-1 w-32 px-2 py-1 rounded-lg border border-accent/40 bg-surface-raised text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          );
        })}
      </div>
      {!locked && (
        <button
          type="button"
          disabled={!answers.every((a) => a && a.trim())}
          onClick={() => onAnswer(answers)}
          className="btn-primary w-full mt-2 py-3 disabled:opacity-50"
        >
          Submit answer
        </button>
      )}
    </div>
  );
}

function LiveMatch({ slide, onAnswer, locked }) {
  const left = slide.left || [];
  const rightOptions = slide.rightOptions || [];
  // placement[rowIdx] = shown index of the right option currently in that row
  const [placement, setPlacement] = useState(() => {
    let s = shuffleArray(rightOptions.map((_, i) => i));
    let safety = 0;
    while (s.every((v, i) => v === i) && rightOptions.length > 1 && safety < 8) {
      s = shuffleArray(rightOptions.map((_, i) => i));
      safety++;
    }
    return s;
  });
  const [dragging, setDragging] = useState(null);

  const onDrop = (toRow) => {
    if (dragging == null || dragging === toRow || locked) return;
    setPlacement((prev) => {
      const next = [...prev];
      [next[dragging], next[toRow]] = [next[toRow], next[dragging]];
      return next;
    });
    setDragging(null);
  };

  return (
    <div>
      <p className="text-sm text-text-muted mb-4">Drag the right column to match each item.</p>
      <div className="space-y-2">
        {left.map((l, rowIdx) => (
          <div key={rowIdx} className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 border border-line-soft rounded-xl bg-surface-raised">
              <span className="text-xs font-mono text-text-dim shrink-0">{String.fromCharCode(65 + rowIdx)}.</span>
              <span className="text-sm md:text-base"><MathText>{l}</MathText></span>
            </div>
            <div
              draggable={!locked}
              onDragStart={() => setDragging(rowIdx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(rowIdx)}
              className={`flex-1 flex items-center gap-2 px-4 py-3 border border-line-soft rounded-xl bg-surface-raised select-none ${
                locked ? '' : 'cursor-grab active:cursor-grabbing hover:border-accent/50'
              }`}
            >
              {!locked && <span className="text-text-dim/40 shrink-0">⠿</span>}
              <span className="flex-1 text-sm md:text-base"><MathText>{rightOptions[placement[rowIdx]]}</MathText></span>
            </div>
          </div>
        ))}
      </div>
      {!locked && (
        <button type="button" onClick={() => onAnswer(placement)} className="btn-primary w-full mt-5 py-3">
          Submit answer
        </button>
      )}
    </div>
  );
}

function LiveOrder({ slide, onAnswer, locked }) {
  const items = slide.items || [];
  const [order, setOrder] = useState(() => items.map((_, i) => i)); // sequence of shown-indices
  const [dragging, setDragging] = useState(null);

  const onDrop = (toPos) => {
    if (dragging == null || dragging === toPos || locked) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragging, 1);
      next.splice(toPos, 0, moved);
      return next;
    });
    setDragging(null);
  };

  return (
    <div>
      {slide.prompt && <p className="text-sm text-text-muted mb-4"><MathText>{slide.prompt}</MathText></p>}
      <div className="space-y-2">
        {order.map((shownIdx, pos) => (
          <div
            key={shownIdx}
            draggable={!locked}
            onDragStart={() => setDragging(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(pos)}
            className={`flex items-center gap-3 px-4 py-3 border border-line-soft rounded-xl bg-surface-raised select-none ${
              locked ? '' : 'cursor-grab active:cursor-grabbing hover:border-accent/50'
            }`}
          >
            <span className="text-xs font-mono text-text-dim shrink-0 w-5">{pos + 1}</span>
            {!locked && <span className="text-text-dim/40 shrink-0">⠿</span>}
            <span className="flex-1 text-sm md:text-base"><MathText>{items[shownIdx]}</MathText></span>
          </div>
        ))}
      </div>
      {!locked && (
        <button type="button" onClick={() => onAnswer(order)} className="btn-primary w-full mt-5 py-3">
          Submit answer
        </button>
      )}
    </div>
  );
}

function LiveTimeline({ slide, onAnswer, locked }) {
  const events = slide.events || [];
  const [order, setOrder] = useState(() => events.map((_, i) => i));
  const [dragging, setDragging] = useState(null);

  const onDrop = (toPos) => {
    if (dragging == null || dragging === toPos || locked) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragging, 1);
      next.splice(toPos, 0, moved);
      return next;
    });
    setDragging(null);
  };

  return (
    <div>
      {slide.prompt && <p className="text-sm text-text-muted mb-4"><MathText>{slide.prompt}</MathText></p>}
      <div className="space-y-2">
        {order.map((shownIdx, pos) => {
          const ev = events[shownIdx];
          return (
            <div
              key={shownIdx}
              draggable={!locked}
              onDragStart={() => setDragging(pos)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(pos)}
              className={`flex items-center gap-3 px-4 py-3 border border-line-soft rounded-xl bg-surface-raised select-none ${
                locked ? '' : 'cursor-grab active:cursor-grabbing hover:border-accent/50'
              }`}
            >
              <span className="text-xs font-mono text-text-dim shrink-0 w-5">{pos + 1}</span>
              {!locked && <span className="text-text-dim/40 shrink-0">⠿</span>}
              <span className="flex-1 text-sm md:text-base"><MathText>{ev?.label}</MathText></span>
              {ev?.year && <span className="text-xs text-text-dim shrink-0">{ev.year}</span>}
            </div>
          );
        })}
      </div>
      {!locked && (
        <button type="button" onClick={() => onAnswer(order)} className="btn-primary w-full mt-5 py-3">
          Submit answer
        </button>
      )}
    </div>
  );
}

function LiveHotspot({ slide, onAnswer, locked }) {
  const [selected, setSelected] = useState(null);
  return (
    <div>
      <h2 className="text-lg md:text-xl font-display leading-snug text-text-primary mb-4">
        <MathText>{slide.question}</MathText>
      </h2>
      <div className="relative w-full rounded-2xl overflow-hidden border border-line-soft select-none">
        <img src={slide.image} alt="" className="w-full h-auto block" />
        {(slide.regions || []).map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={locked}
            onClick={() => setSelected(r.id)}
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
            className={`absolute border-2 rounded-lg transition-colors ${
              selected === r.id ? 'border-accent bg-accent/20' : 'border-white/60 bg-white/5 hover:bg-accent/10'
            }`}
            aria-label={r.label}
          />
        ))}
      </div>
      {!locked && (
        <button
          type="button"
          disabled={selected == null}
          onClick={() => onAnswer(selected)}
          className="btn-primary w-full mt-4 py-3 disabled:opacity-50"
        >
          Submit answer
        </button>
      )}
    </div>
  );
}

const LIVE_COMPONENTS = {
  choice: LiveChoice,
  fillblank: LiveFillBlank,
  match: LiveMatch,
  order: LiveOrder,
  timeline: LiveTimeline,
  hotspot: LiveHotspot,
};

/* ──────────────────────────────────────────────────────────────────────────
   Screens
   ────────────────────────────────────────────────────────────────────────── */

function JoinScreen({ onJoin, joining, joinError, initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const [nickname, setNickname] = useState('');
  const [preview, setPreview] = useState(null);
  const previewTimer = useRef(null);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (code.trim().length < 4) { setPreview(null); return; }
    previewTimer.current = setTimeout(async () => {
      try {
        const data = await api.previewLiveSessionByCode(code.trim());
        setPreview(data.session);
      } catch {
        setPreview(null);
      }
    }, 400);
    return () => clearTimeout(previewTimer.current);
  }, [code]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-surface-body text-text-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-serif italic text-2xl text-accent mb-1">Caplet.</p>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">Join a live session</h1>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onJoin(code.trim(), nickname.trim()); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wide mb-2">Session code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={16}
              autoFocus
              className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.2em] rounded-2xl border border-line-soft bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            {preview && (
              <p className="text-center text-sm text-emerald-500 mt-2">Joining: {preview.lessonTitle}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wide mb-2">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              className="w-full px-4 py-3 rounded-2xl border border-line-soft bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {joinError && <p className="text-sm text-rose-500 text-center">{joinError}</p>}

          <button
            type="submit"
            disabled={joining || !code.trim() || !nickname.trim()}
            className="btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PlayLive() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [participant, setParticipant] = useState(null); // { token, id, nickname, sessionId }

  const [roster, setRoster] = useState([]);
  const [current, setCurrent] = useState(null); // state:update
  const [myAnswer, setMyAnswer] = useState(null); // { response } once locked in
  const [ackResult, setAckResult] = useState(null); // { correct, pointsAwarded } from the answer ack
  const [reveal, setReveal] = useState(null); // results:reveal
  const [youResult, setYouResult] = useState(null); // you:result
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);
  const [connError, setConnError] = useState(null);

  const socketRef = useRef(null);

  const handleJoin = async (code, nickname) => {
    setJoining(true);
    setJoinError(null);
    try {
      const data = await api.joinLiveSession(code, nickname);
      setParticipant({ token: data.token, id: data.participant.id, nickname: data.participant.nickname, sessionId: data.session.id });
    } catch (e) {
      setJoinError(e.message || 'Could not join — check the code and try again');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!participant?.token) return;
    const socket = connectParticipantSocket(participant.token);
    socketRef.current = socket;

    socket.on('connect_error', (e) => setConnError(e.message || 'Connection error'));
    socket.on('lobby:roster', (d) => setRoster(d.players || []));
    socket.on('state:update', (d) => {
      setCurrent(d);
      setMyAnswer(null);
      setAckResult(null);
      setReveal(null);
      setYouResult(null);
    });
    socket.on('results:reveal', (d) => setReveal(d));
    socket.on('you:result', (d) => setYouResult(d));
    socket.on('session:ended', (d) => setFinalLeaderboard(d.leaderboard || []));

    return () => socket.disconnect();
  }, [participant?.token]);

  const submitAnswer = (response) => {
    if (!current || myAnswer) return;
    setMyAnswer({ response });
    socketRef.current.emit('participant:answer', { slideIndex: current.slideIndex, response }, (ack) => {
      if (!ack?.ok) {
        setMyAnswer(null);
        setJoinError(ack?.error || null);
        return;
      }
      setAckResult(ack);
    });
  };

  if (!participant) {
    return <JoinScreen onJoin={handleJoin} joining={joining} joinError={joinError} initialCode={searchParams.get('code') || ''} />;
  }

  if (finalLeaderboard) {
    const mine = finalLeaderboard.find((p) => p.id === participant.id);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 bg-surface-body text-text-primary overflow-y-auto">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent mb-3">Session ended</p>
          {mine ? (
            <>
              <Motion.h1
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="text-4xl font-display font-extrabold tracking-tight mb-2"
              >
                #{mine.rank}
              </Motion.h1>
              <p className="text-text-muted mb-1">{mine.score.toLocaleString()} points</p>
              {mine.bestStreak >= 2 && (
                <p className="text-sm text-orange-500 font-bold mb-6">🔥 Best streak: {mine.bestStreak}</p>
              )}
            </>
          ) : (
            <p className="text-text-muted mb-8">Thanks for playing!</p>
          )}
          <div className={mine?.bestStreak >= 2 ? '' : 'mt-6'}>
            <Podium leaderboard={finalLeaderboard} highlightId={participant.id} />
          </div>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary mt-8">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    // Lobby
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-surface-body text-text-primary">
        <div className="w-full max-w-sm text-center">
          <p className="font-serif italic text-xl text-accent mb-1">Caplet.</p>
          <h1 className="text-xl font-display font-bold mb-2">You're in, {participant.nickname}!</h1>
          <p className="text-text-muted mb-6">Waiting for the host to start…</p>
          {connError && <p className="text-sm text-rose-500 mb-4">{connError}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence initial={false}>
              {roster.map((p) => (
                <Motion.span
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                    p.id === participant.id ? 'border-accent text-accent bg-accent/10' : 'border-line-soft text-text-dim'
                  }`}
                >
                  {p.nickname}
                </Motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  const LiveComp = LIVE_COMPONENTS[current.slide?.type];
  const isReveal = current.status === 'reveal' || (reveal && reveal.slideIndex === current.slideIndex);

  return (
    <div className="min-h-[100dvh] bg-surface-body text-text-primary flex flex-col">
      <div className="shrink-0 px-4 pt-4">
        <TimerBar opensAt={current.opensAt} windowMs={current.windowMs} />
        <p className="text-center text-xs font-medium text-text-dim mt-2">
          Slide {current.slideIndex + 1} / {current.slideCount}
        </p>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          {current.status === 'active' && (
            <div className="rounded-3xl border border-line-soft bg-surface-raised min-h-[320px] flex flex-col overflow-hidden">
              <SlideRenderer slide={current.slide} variant="player" />
            </div>
          )}

          {current.status === 'question_open' && !myAnswer && !isReveal && LiveComp && (
            <LiveComp slide={current.slide} onAnswer={submitAnswer} locked={false} />
          )}

          {current.status === 'question_open' && myAnswer && !ackResult && !isReveal && (
            <div className="text-center py-16">
              <Motion.p
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="text-xl font-display font-bold"
              >
                Locked in!
              </Motion.p>
              <p className="text-text-muted mt-2">Waiting for the round to end…</p>
            </div>
          )}

          {(myAnswer && ackResult && !isReveal) && (
            <AnswerCelebration
              correct={ackResult.correct}
              pointsAwarded={ackResult.pointsAwarded}
              streakBonus={ackResult.streakBonus}
              streak={ackResult.streak}
            />
          )}

          {isReveal && (
            <div className="text-center">
              {youResult ? (
                <AnswerCelebration
                  correct={youResult.correct}
                  pointsAwarded={youResult.pointsAwarded}
                  streakBonus={youResult.streakBonus}
                  streak={youResult.streak}
                  rank={youResult.rank}
                />
              ) : (
                <p className="text-text-muted mb-6 py-10">Round over</p>
              )}
              {reveal && (
                <div className="max-w-xs mx-auto">
                  <AnimatedLeaderboard entries={reveal.leaderboard} highlightId={participant.id} limit={5} />
                </div>
              )}
              <p className="text-xs text-text-dim mt-6 mb-10">Waiting for the host to continue…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
