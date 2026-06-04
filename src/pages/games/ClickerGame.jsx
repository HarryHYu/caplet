import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import { formatNumber } from '../../lib/format';

/* ---------- pure helpers ---------- */

function genCost(gen, owned, growth) {
  return Math.ceil(gen.baseCost * Math.pow(growth, owned));
}

function cpsMultiplier(state, catalog) {
  let m = 1;
  for (const u of catalog.upgrades) {
    if (state.upgrades.includes(u.id) && u.effect.type === 'cps_mult') m *= u.effect.value;
  }
  return m;
}

function clickPower(state, catalog) {
  let m = 1;
  for (const u of catalog.upgrades) {
    if (state.upgrades.includes(u.id) && u.effect.type === 'click_mult') m *= u.effect.value;
  }
  return m;
}

function coinsPerSec(state, catalog) {
  const mult = cpsMultiplier(state, catalog);
  let cps = 0;
  for (const g of catalog.generators) {
    const owned = state.generators[g.id] || 0;
    cps += g.baseCps * owned * mult;
  }
  return cps;
}

/* ---------- component ---------- */

export default function ClickerGame() {
  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pop, setPop] = useState(0); // click feedback key
  const stateRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const catalog = meta?.catalog;
  const stage = meta?.stage ?? 1;

  // Load + apply offline earnings.
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getGame('clicker');
        setGame(data.game);
        setMeta(data.meta);
        const loaded = { ...data.game?.defaultState, ...data.state };
        const cat = data.meta.catalog;
        const elapsed = Math.min(
          Math.max(0, (Date.now() - (loaded.lastSaved || Date.now())) / 1000),
          cat.offlineCapSeconds
        );
        const earned = coinsPerSec(loaded, cat) * elapsed;
        setState({ ...loaded, gameCoins: (loaded.gameCoins || 0) + earned, lastSaved: Date.now() });
      } catch {
        /* leave loading */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    await api.saveGame('clicker', { ...s, lastSaved: Date.now() }).catch(() => {});
  }, []);

  // Idle production tick.
  useEffect(() => {
    if (!catalog) return undefined;
    const id = setInterval(() => {
      setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + coinsPerSec(prev, catalog) * 0.2 } : prev));
    }, 200);
    return () => clearInterval(id);
  }, [catalog]);

  // Autosave every 15s + on unmount.
  useEffect(() => {
    if (loading) return undefined;
    const id = setInterval(save, 15000);
    return () => { clearInterval(id); save(); };
  }, [loading, save]);

  const handleClick = () => {
    setPop((p) => p + 1);
    setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + clickPower(prev, catalog), totalClicks: prev.totalClicks + 1 } : prev));
  };

  const buyGenerator = (gen) => {
    setState((prev) => {
      if (!prev || gen.requiredStage > stage) return prev;
      const owned = prev.generators[gen.id] || 0;
      const cost = genCost(gen, owned, catalog.costGrowth);
      if (prev.gameCoins < cost) return prev;
      return {
        ...prev,
        gameCoins: prev.gameCoins - cost,
        generators: { ...prev.generators, [gen.id]: owned + 1 },
      };
    });
  };

  const buyUpgrade = (up) => {
    setState((prev) => {
      if (!prev || prev.upgrades.includes(up.id) || up.requiredStage > stage || prev.gameCoins < up.cost) return prev;
      return { ...prev, gameCoins: prev.gameCoins - up.cost, upgrades: [...prev.upgrades, up.id] };
    });
  };

  if (loading || !state || !catalog) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading Compound…" />
      </div>
    );
  }

  const cps = coinsPerSec(state, catalog);
  const availableUpgrades = catalog.upgrades.filter((u) => !state.upgrades.includes(u.id));

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal-text">
          <div>
            <span className="section-kicker">Games · {game?.icon} {game?.title}</span>
            <h1 className="text-5xl md:text-7xl">Compound.</h1>
            <p className="mt-4 text-text-muted font-medium">Tap to earn, invest to grow.</p>
          </div>
          <Link to="/games" className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-accent">← All games</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Clicker */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 flex flex-col items-center gap-6 border border-line-soft bg-surface-raised p-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-500 tabular-nums">🪙 {formatNumber(state.gameCoins)}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim mt-1">{formatNumber(cps)} / sec</p>
              </div>
              <button
                type="button"
                onClick={handleClick}
                className="relative w-44 h-44 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-6xl shadow-lg active:scale-95 transition-transform select-none"
                aria-label="Tap to earn coins"
              >
                🪙
                <span key={pop} className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-amber-300/60 animate-ping-once" />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                +{formatNumber(clickPower(state, catalog))} per tap · {formatNumber(state.totalClicks)} taps
              </p>

              {/* Stage gate */}
              <div className="w-full border-t border-line-soft pt-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Stage {stage} / {meta.maxStage}</p>
                {meta.nextStage ? (
                  <p className="text-[11px] text-text-muted mt-2">
                    Complete <span className="font-bold text-text-primary">{meta.nextStage.lessonsNeeded}</span> more lesson{meta.nextStage.lessonsNeeded === 1 ? '' : 's'} to unlock <span className="font-bold">Stage {meta.nextStage.stage}</span>.
                  </p>
                ) : (
                  <p className="text-[11px] text-text-muted mt-2">Max stage reached 🎉</p>
                )}
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim mt-2">{meta.lessonsCompleted} lessons completed</p>
              </div>
            </div>
          </div>

          {/* Investments + upgrades */}
          <div className="lg:col-span-7 space-y-10">
            {availableUpgrades.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">Upgrades</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line-soft border border-line-soft">
                  {availableUpgrades.map((u) => {
                    const locked = u.requiredStage > stage;
                    const affordable = !locked && state.gameCoins >= u.cost;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => buyUpgrade(u)}
                        disabled={!affordable}
                        className={`bg-surface-body p-5 text-left transition-colors ${affordable ? 'hover:bg-surface-raised' : 'opacity-60 cursor-not-allowed'}`}
                      >
                        <p className="text-sm font-bold uppercase tracking-tight text-text-primary">{u.icon} {u.name}</p>
                        <p className="text-[11px] text-text-muted mt-1">{u.desc}</p>
                        <p className="text-[11px] font-bold text-amber-500 mt-2">
                          {locked ? `🔒 Stage ${u.requiredStage}` : `🪙 ${formatNumber(u.cost)}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">Investments</p>
              <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft">
                {catalog.generators.map((g) => {
                  const owned = state.generators[g.id] || 0;
                  const locked = g.requiredStage > stage;
                  const cost = genCost(g, owned, catalog.costGrowth);
                  const affordable = !locked && state.gameCoins >= cost;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => buyGenerator(g)}
                      disabled={!affordable}
                      className={`bg-surface-body p-5 flex items-center justify-between gap-4 text-left transition-colors ${affordable ? 'hover:bg-surface-raised' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-3xl shrink-0">{locked ? '🔒' : g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-tight text-text-primary truncate">{g.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mt-1">
                            {locked ? `Unlocks at Stage ${g.requiredStage}` : `+${formatNumber(g.baseCps)}/sec each`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-amber-500">{locked ? '—' : `🪙 ${formatNumber(cost)}`}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mt-1">Owned {owned}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
