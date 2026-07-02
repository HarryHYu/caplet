import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { connectHostSocket } from '../../services/liveSocket';
import SlideRenderer from '../../components/lesson/SlideRenderer';
import CapletLoader from '../../components/CapletLoader';

const TYPE_LABELS = {
  choice: 'Choice question',
  fillblank: 'Fill in the blanks',
  match: 'Match',
  order: 'Put in order',
  hotspot: 'Hotspot',
  timeline: 'Timeline',
};

function useCountdown(opensAt, windowMs) {
  const [remainingMs, setRemainingMs] = useState(null);
  useEffect(() => {
    if (!opensAt || !windowMs) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, opensAt + windowMs - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [opensAt, windowMs]);
  return remainingMs;
}

function RosterList({ roster }) {
  if (!roster.length) {
    return <p className="text-sm text-text-muted">Waiting for players to join…</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {roster.map((p) => (
        <span
          key={p.id}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
            p.connected
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-line-soft text-text-dim opacity-60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'bg-accent' : 'bg-text-dim/40'}`} />
          {p.nickname}
        </span>
      ))}
    </div>
  );
}

function Podium({ leaderboard }) {
  const top3 = leaderboard.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]); // silver, gold, bronze layout
  const heights = { 0: 'h-28', 1: 'h-40', 2: 'h-20' };
  const medalColors = { 0: 'bg-slate-300 text-slate-900', 1: 'bg-amber-400 text-amber-950', 2: 'bg-orange-300 text-orange-950' };

  return (
    <div>
      <div className="flex items-end justify-center gap-4 mb-8">
        {order.map((i) => {
          const p = top3[i];
          return (
            <div key={p.id} className="flex flex-col items-center gap-2 w-24">
              <p className="text-sm font-bold text-text-primary truncate max-w-full">{p.nickname}</p>
              <p className="text-xs text-text-dim">{p.score} pts</p>
              <div className={`w-full rounded-t-xl flex items-center justify-center font-display font-extrabold text-lg ${heights[i]} ${medalColors[i]}`}>
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
      {leaderboard.length > 3 && (
        <ol className="space-y-1.5 max-w-md mx-auto">
          {leaderboard.slice(3).map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-raised border border-line-soft text-sm">
              <span className="text-text-dim font-mono">{p.rank}.</span>
              <span className="text-text-primary font-medium truncate">{p.nickname}</span>
              <span className="text-text-dim">{p.score} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function HostLive() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [roster, setRoster] = useState([]);
  const [current, setCurrent] = useState(null); // last state:update
  const [answerCount, setAnswerCount] = useState(null); // last host:answerCount
  const [reveal, setReveal] = useState(null); // last results:reveal
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  const socketRef = useRef(null);
  const remainingMs = useCountdown(current?.opensAt, current?.windowMs);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getLiveSession(code);
        if (!cancelled) setSession(data.session);
      } catch (e) {
        if (!cancelled) setLoadError(e.message || 'Could not load this session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!session?.id) return;
    const socket = connectHostSocket(session.id);
    socketRef.current = socket;

    socket.on('connect_error', (e) => setActionError(e.message === 'unauthorized' ? 'Could not connect — please refresh.' : e.message));
    socket.on('lobby:roster', (d) => setRoster(d.players || []));
    socket.on('state:update', (d) => {
      setCurrent(d);
      setAnswerCount(null);
      setReveal(null);
      setSession((s) => (s ? { ...s, status: d.status, currentSlideIndex: d.slideIndex } : s));
    });
    socket.on('host:answerCount', (d) => setAnswerCount(d));
    socket.on('results:reveal', (d) => {
      setReveal(d);
      setSession((s) => (s ? { ...s, status: 'reveal' } : s));
    });
    socket.on('session:ended', (d) => {
      setFinalLeaderboard(d.leaderboard || []);
      setSession((s) => (s ? { ...s, status: 'finished' } : s));
    });

    return () => socket.disconnect();
  }, [session?.id]);

  const emit = useCallback((event) => {
    setBusy(true);
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) { setBusy(false); return resolve({ ok: false }); }
      socket.emit(event, {}, (ack) => {
        setBusy(false);
        setActionError(ack?.ok ? null : ack?.error || 'Something went wrong');
        resolve(ack);
      });
    });
  }, []);

  const joinUrl = useMemo(() => {
    if (!session?.code) return '';
    return `${window.location.origin}/play?code=${session.code}`;
  }, [session?.code]);

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading session…" />
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="min-h-[100dvh] bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-2xl font-display font-extrabold tracking-tight mb-4">{loadError || 'Session not found'}</p>
          <Link to="/dashboard" className="btn-primary py-3 px-8 inline-flex">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface-body text-text-primary">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="section-kicker">Live session</p>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">{session.lessonTitle}</h1>
          </div>
          {session.status !== 'finished' && (
            <button
              type="button"
              onClick={async () => { if (window.confirm('End this live session for everyone?')) await emit('host:end'); }}
              className="btn-secondary text-sm shrink-0"
            >
              End session
            </button>
          )}
        </div>

        {actionError && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-rose-400/40 bg-rose-500/[0.06] text-sm text-rose-500">
            {actionError}
          </div>
        )}

        {session.status === 'lobby' && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-line-soft bg-surface-raised p-8 text-center">
              <p className="text-xs font-medium text-text-dim uppercase tracking-[0.14em] mb-3">Join code</p>
              <p className="text-5xl md:text-6xl font-display font-extrabold tracking-[0.08em] text-accent mb-5">{session.code}</p>
              <button type="button" onClick={copyLink} className="btn-secondary text-sm inline-flex">
                {copied ? 'Link copied!' : 'Copy join link'}
              </button>
              <p className="text-xs text-text-dim mt-3 break-all">{joinUrl}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-text-primary mb-3">
                Players ({roster.length})
              </p>
              <RosterList roster={roster} />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => emit('host:start')}
              className="btn-primary w-full py-4 text-base"
            >
              {busy ? 'Starting…' : 'Start session'}
            </button>
          </div>
        )}

        {(session.status === 'active' || session.status === 'question_open' || session.status === 'reveal') && current && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-medium text-text-dim">
              <span className="font-mono text-accent">
                Slide {current.slideIndex + 1} / {current.slideCount}
              </span>
              {session.status === 'question_open' && remainingMs != null && (
                <span className="font-mono">{Math.ceil(remainingMs / 1000)}s remaining</span>
              )}
            </div>

            <div className="rounded-3xl border border-line-soft bg-surface-raised overflow-hidden min-h-[220px]">
              {session.status === 'question_open' || (session.status === 'reveal' && reveal?.slideIndex === current.slideIndex) ? (
                <div className="p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent mb-3">
                    {TYPE_LABELS[current.slide.type] || 'Question'}
                  </p>
                  <h2 className="text-xl md:text-2xl font-display font-bold mb-6">
                    {current.slide.question || current.slide.prompt || current.slide.template || 'Live question'}
                  </h2>

                  {answerCount?.distribution && (current.slide.options || []).length > 0 && (
                    <div className="space-y-2 mb-4">
                      {current.slide.options.map((opt, i) => {
                        const count = answerCount.distribution[i] || 0;
                        const max = Math.max(1, ...answerCount.distribution);
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-text-muted w-8 shrink-0">{String.fromCharCode(65 + i)}</span>
                            <div className="flex-1 h-6 rounded-full bg-surface-soft overflow-hidden">
                              <div
                                className="h-full bg-accent/70 rounded-full transition-all duration-300"
                                style={{ width: `${(count / max) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono text-text-dim w-6 text-right shrink-0">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-sm text-text-dim">
                    {answerCount?.answered ?? reveal?.totalAnswered ?? 0} / {roster.filter((p) => p.connected).length || roster.length} answered
                  </p>
                </div>
              ) : (
                <div className="p-4 max-h-[420px] overflow-y-auto">
                  <SlideRenderer slide={current.slide} />
                </div>
              )}
            </div>

            {session.status === 'reveal' && reveal && (
              <div className="rounded-2xl border border-line-soft bg-surface-raised p-5">
                <p className="text-sm font-bold text-text-primary mb-3">
                  {reveal.correctCount} / {reveal.totalAnswered} got it right
                </p>
                <ol className="space-y-1">
                  {reveal.leaderboard.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-dim font-mono">{p.rank}.</span>
                      <span className="text-text-primary font-medium truncate">{p.nickname}</span>
                      <span className="text-text-dim">{p.score} pts</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {session.status === 'question_open' ? (
                <button type="button" disabled={busy} onClick={() => emit('host:reveal')} className="btn-primary px-8">
                  Reveal
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => emit('host:next')} className="btn-primary px-8">
                  {current.slideIndex + 1 >= current.slideCount ? 'Finish' : 'Next'}
                </button>
              )}
            </div>
          </div>
        )}

        {session.status === 'finished' && (
          <div className="space-y-8">
            <h2 className="text-xl font-display font-bold text-center">Final results</h2>
            <Podium leaderboard={finalLeaderboard || []} />
            <div className="flex justify-center">
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
                Back to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
