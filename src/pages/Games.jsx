import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getGames();
        setGames(data?.games || []);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading games…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-12 reveal-text">
          <span className="section-kicker">Games</span>
          <h1 className="text-5xl md:text-7xl">Play & learn.</h1>
          <p className="mt-6 text-lg text-text-muted font-medium max-w-xl">
            Fun games powered by your learning. Complete lessons to unlock more.
          </p>
        </header>

        {games.length === 0 ? (
          <div className="border border-line-soft bg-surface-body p-16 text-center text-text-dim uppercase tracking-widest text-[11px] font-bold italic">
            No games available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft">
            {games.map((g) => (
              <Link
                key={g.key}
                to={g.path}
                className="group bg-surface-body p-8 hover:bg-surface-raised transition-colors flex flex-col gap-4"
              >
                <span className="text-5xl">{g.icon}</span>
                <div>
                  <p className="text-lg font-bold uppercase tracking-tight group-hover:text-accent transition-colors">{g.title}</p>
                  <p className="text-[12px] text-text-muted mt-2 leading-relaxed">{g.description}</p>
                </div>
                <span className="mt-auto text-[10px] font-bold uppercase tracking-widest text-accent">Play →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
