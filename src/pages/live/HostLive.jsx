import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../../services/api';
import { connectHostSocket } from '../../services/liveSocket';
import SlideRenderer from '../../components/lesson/SlideRenderer';
import CapletLoader from '../../components/CapletLoader';
import MathText from '../../components/MathText';
import AnimatedLeaderboard from '../../components/live/AnimatedLeaderboard';
import Podium from '../../components/live/Podium';

const TYPE_LABELS = {
  choice: 'Choice question',
  fillblank: 'Fill in the blanks',
  match: 'Match',
  order: 'Put in order',
  hotspot: 'Hotspot',
  timeline: 'Timeline',
};

// When a {{blank}} sits inside a $...$/$$...$$ math span, leaving it as-is
// breaks the delimiter balance and KaTeX renders garbage; mirrors
// SlideRenderer.jsx's sanitizeFillBlankTemplate. The host console has no
// input fields, so once the template is math-safe, blank markers are
// swapped for a plain visual placeholder instead of being parsed.
function questionHeadline(slide) {
  if (!slide) return 'Live question';
  if (slide.type === 'fillblank') {
    const sanitized = (slide.template || '')
      .replace(/\$\$([\s\S]*?)\$\$/g, (m, inner) => (/\{\{\d+\}\}/.test(inner) ? inner : m))
      .replace(/\$([^$\n]+?)\$/g, (m, inner) => (/\{\{\d+\}\}/.test(inner) ? inner : m));
    return sanitized.replace(/\{\{\d+\}\}/g, '▁▁▁▁');
  }
  return slide.question || slide.prompt || 'Live question';
}

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
                <Motion.span
                  key={Math.ceil(remainingMs / 1000)}
                  initial={{ scale: remainingMs < 5000 ? 1.4 : 1.1, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`font-mono font-bold ${remainingMs < 5000 ? 'text-rose-500' : ''}`}
                >
                  {Math.ceil(remainingMs / 1000)}s remaining
                </Motion.span>
              )}
            </div>

            <div className="rounded-3xl border border-line-soft bg-surface-raised overflow-hidden min-h-[220px]">
              {session.status === 'question_open' || session.status === 'reveal' ? (
                <div className="p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent mb-3">
                    {TYPE_LABELS[current.slide.type] || 'Question'}
                  </p>
                  <h2 className="text-xl md:text-2xl font-display font-bold mb-6">
                    <MathText>{questionHeadline(current.slide)}</MathText>
                  </h2>

                  {answerCount?.distribution && (current.slide.options || []).length > 0 && (
                    <div className="space-y-2 mb-4">
                      {current.slide.options.map((opt, i) => {
                        const count = answerCount.distribution[i] || 0;
                        const max = Math.max(1, ...answerCount.distribution);
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-text-muted w-6 shrink-0">{String.fromCharCode(65 + i)}</span>
                            <span className="text-sm text-text-primary w-40 shrink-0 truncate"><MathText>{opt}</MathText></span>
                            <div className="flex-1 h-6 rounded-full bg-surface-soft overflow-hidden">
                              <Motion.div
                                className="h-full bg-accent/70 rounded-full"
                                animate={{ width: `${(count / max) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
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
                <AnimatedLeaderboard entries={reveal.leaderboard} limit={5} />
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
            {finalLeaderboard?.length ? (
              <Podium leaderboard={finalLeaderboard} />
            ) : (
              <p className="text-center text-text-muted">No players finished this session.</p>
            )}
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
