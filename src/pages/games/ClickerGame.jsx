import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import { formatNumber } from '../../lib/format';

/* ---------- pure helpers ---------- */

function genCost(gen, owned, growth) {
  return Math.ceil(gen.baseCost * Math.pow(growth, owned));
}
function cpsMultiplier(state, catalog) {
  let m = 1;
  for (const u of catalog.upgrades) if (state.upgrades.includes(u.id) && u.effect.type === 'cps_mult') m *= u.effect.value;
  return m;
}
function clickPower(state, catalog) {
  let m = 1;
  for (const u of catalog.upgrades) if (state.upgrades.includes(u.id) && u.effect.type === 'click_mult') m *= u.effect.value;
  return m;
}
function coinsPerSec(state, catalog) {
  const mult = cpsMultiplier(state, catalog);
  let cps = 0;
  for (const g of catalog.generators) cps += g.baseCps * (state.generators[g.id] || 0) * mult;
  return cps;
}

/* ---------- component ---------- */

export default function ClickerGame() {
  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bonus, setBonus] = useState(null); // {x,y} golden bonus coin

  const stateRef = useRef(null);
  const coinRef = useRef(null);
  const totalRef = useRef(null);
  const fxRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const catalog = meta?.catalog;
  const stage = meta?.stage ?? 1;

  /* load + offline earnings */
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getGame('clicker');
        setGame(data.game);
        setMeta(data.meta);
        const cat = data.meta.catalog;
        const loaded = { gameCoins: 0, generators: {}, upgrades: [], totalClicks: 0, lastSaved: Date.now(), ...data.state };
        const elapsed = Math.min(Math.max(0, (Date.now() - (loaded.lastSaved || Date.now())) / 1000), cat.offlineCapSeconds);
        loaded.gameCoins += coinsPerSec(loaded, cat) * elapsed;
        loaded.lastSaved = Date.now();
        setState(loaded);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const save = useCallback(async () => {
    const s = stateRef.current;
    if (s) await api.saveGame('clicker', { ...s, lastSaved: Date.now() }).catch(() => {});
  }, []);

  /* idle tick */
  useEffect(() => {
    if (!catalog) return undefined;
    const id = setInterval(() => {
      setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + coinsPerSec(prev, catalog) * 0.2 } : prev));
    }, 200);
    return () => clearInterval(id);
  }, [catalog]);

  /* autosave */
  useEffect(() => {
    if (loading) return undefined;
    const id = setInterval(save, 15000);
    return () => { clearInterval(id); save(); };
  }, [loading, save]);

  /* golden bonus coin: appears periodically */
  useEffect(() => {
    if (loading) return undefined;
    let timeout;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBonus({ x: 10 + Math.random() * 70, y: 15 + Math.random() * 55 });
        // auto-despawn after 9s
        timeout = setTimeout(() => setBonus(null), 9000);
        schedule();
      }, 45000 + Math.random() * 45000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [loading]);

  /* ---------- click FX ---------- */
  const spawnFx = (amount, originEl) => {
    const layer = fxRef.current;
    if (!layer || !originEl) return;
    const lr = layer.getBoundingClientRect();
    const r = originEl.getBoundingClientRect();
    const cx = r.left - lr.left + r.width / 2;
    const cy = r.top - lr.top + r.height / 2;

    // floating +N
    const label = document.createElement('div');
    label.textContent = `+${formatNumber(amount)}`;
    label.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);font-weight:800;color:#f59e0b;font-size:20px;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.2);`;
    layer.appendChild(label);
    gsap.to(label, { y: -70, x: (Math.random() - 0.5) * 40, opacity: 0, duration: 0.9, ease: 'power1.out', onComplete: () => label.remove() });

    // particle coins
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('div');
      p.textContent = '🪙';
      p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-size:${12 + Math.random() * 12}px;pointer-events:none;`;
      layer.appendChild(p);
      gsap.to(p, {
        x: (Math.random() - 0.5) * 220,
        y: (Math.random() - 0.5) * 220 - 40,
        opacity: 0,
        rotation: (Math.random() - 0.5) * 360,
        duration: 0.7 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => p.remove(),
      });
    }
  };

  const handleClick = () => {
    const power = clickPower(stateRef.current, catalog);
    setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + power, totalClicks: prev.totalClicks + 1 } : prev));
    if (coinRef.current) {
      gsap.fromTo(coinRef.current, { scale: 0.86 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1,0.4)' });
    }
    if (totalRef.current) {
      gsap.fromTo(totalRef.current, { scale: 1.18 }, { scale: 1, duration: 0.3, ease: 'power2.out' });
    }
    spawnFx(power, coinRef.current);
  };

  const handleBonus = () => {
    const s = stateRef.current;
    const reward = Math.max(clickPower(s, catalog) * 25, coinsPerSec(s, catalog) * 45, 50);
    setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + reward } : prev));
    setBonus(null);
  };

  const buyGenerator = (gen) => {
    setState((prev) => {
      if (!prev || gen.requiredStage > stage) return prev;
      const owned = prev.generators[gen.id] || 0;
      const cost = genCost(gen, owned, catalog.costGrowth);
      if (prev.gameCoins < cost) return prev;
      return { ...prev, gameCoins: prev.gameCoins - cost, generators: { ...prev.generators, [gen.id]: owned + 1 } };
    });
  };
  const buyUpgrade = (up) => {
    setState((prev) => {
      if (!prev || prev.upgrades.includes(up.id) || up.requiredStage > stage || prev.gameCoins < up.cost) return prev;
      return { ...prev, gameCoins: prev.gameCoins - up.cost, upgrades: [...prev.upgrades, up.id] };
    });
  };

  if (loading || !state || !catalog) {
    return <div className="min-h-screen bg-surface-body flex items-center justify-center"><CapletLoader message="Loading Compound…" /></div>;
  }

  const cps = coinsPerSec(state, catalog);
  const availableUpgrades = catalog.upgrades.filter((u) => !state.upgrades.includes(u.id));
  // Stage progress (lessons toward next stage)
  const ns = meta.nextStage;
  const prevThreshold = catalog.stageThresholds[stage - 1] ?? 0;
  const stagePct = ns ? Math.min(100, Math.max(0, ((meta.lessonsCompleted - prevThreshold) / (ns.at - prevThreshold)) * 100)) : 100;

  return (
    <div className="cc-root min-h-screen py-32 selection:bg-accent selection:text-white">
      <style>{`
        .cc-root{background:radial-gradient(1200px 600px at 50% -10%, var(--accent-soft), transparent), var(--color-surface-body, #fff);}
        @keyframes ccGlow{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.35),0 18px 40px -12px rgba(245,158,11,.55)}50%{box-shadow:0 0 0 14px rgba(245,158,11,0),0 18px 50px -10px rgba(245,158,11,.7)}}
        @keyframes ccSpinShine{0%{transform:translateX(-120%) rotate(8deg)}100%{transform:translateX(220%) rotate(8deg)}}
        @keyframes ccFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes ccAfford{0%,100%{border-color:rgba(245,158,11,.5)}50%{border-color:rgba(245,158,11,1)}}
        .cc-coin{position:relative;width:13rem;height:13rem;border-radius:9999px;border:none;cursor:pointer;
          background:radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #b45309);
          display:flex;align-items:center;justify-content:center;font-size:5.5rem;line-height:1;
          animation:ccGlow 2.4s ease-in-out infinite;overflow:hidden;user-select:none;}
        .cc-coin:active{cursor:grabbing}
        .cc-coin::after{content:"";position:absolute;top:0;left:0;width:45%;height:160%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
          animation:ccSpinShine 3.2s linear infinite;}
        .cc-coin-ring{position:absolute;inset:-10px;border-radius:9999px;border:2px dashed rgba(245,158,11,.35);animation:ccFloat 4s ease-in-out infinite;}
        .cc-afford{animation:ccAfford 1.4s ease-in-out infinite;}
        .cc-bonus{position:absolute;z-index:30;font-size:2.5rem;cursor:pointer;filter:drop-shadow(0 0 10px gold);animation:ccFloat 1.6s ease-in-out infinite;}
      `}</style>

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
            <div className="lg:sticky lg:top-28 flex flex-col items-center gap-7 border border-line-soft bg-surface-raised p-8 rounded-2xl overflow-hidden">
              <div className="text-center">
                <p ref={totalRef} className="text-5xl font-extrabold text-amber-500 tabular-nums">🪙 {formatNumber(state.gameCoins)}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim mt-1">{formatNumber(cps)} / sec</p>
              </div>

              {/* coin + fx layer + bonus */}
              <div ref={fxRef} className="relative flex items-center justify-center w-full h-60">
                <span className="cc-coin-ring" />
                <button ref={coinRef} type="button" onClick={handleClick} className="cc-coin" aria-label="Tap to earn coins">🪙</button>
                {bonus && (
                  <button
                    type="button"
                    onClick={handleBonus}
                    className="cc-bonus"
                    style={{ left: `${bonus.x}%`, top: `${bonus.y}%` }}
                    aria-label="Bonus coin"
                    title="Bonus!"
                  >💰</button>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                +{formatNumber(clickPower(state, catalog))} per tap · {formatNumber(state.totalClicks)} taps
              </p>

              {/* Stage gate + progress bar */}
              <div className="w-full border-t border-line-soft pt-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Stage {stage} / {meta.maxStage}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-line-soft overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${stagePct}%` }} />
                </div>
                {ns ? (
                  <p className="text-[11px] text-text-muted mt-2">
                    <span className="font-bold text-text-primary">{ns.lessonsNeeded}</span> more lesson{ns.lessonsNeeded === 1 ? '' : 's'} → <span className="font-bold">Stage {ns.stage}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-text-muted mt-2">Max stage reached 🎉</p>
                )}
              </div>
            </div>
          </div>

          {/* Investments + upgrades */}
          <div className="lg:col-span-7 space-y-10">
            {availableUpgrades.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">Upgrades</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableUpgrades.map((u) => {
                    const locked = u.requiredStage > stage;
                    const affordable = !locked && state.gameCoins >= u.cost;
                    return (
                      <button key={u.id} type="button" onClick={() => buyUpgrade(u)} disabled={!affordable}
                        className={`text-left p-5 rounded-xl border bg-surface-body transition-all ${affordable ? 'border-amber-400/60 hover:-translate-y-0.5 hover:shadow-lg cc-afford' : 'border-line-soft opacity-60 cursor-not-allowed'}`}>
                        <p className="text-sm font-bold uppercase tracking-tight text-text-primary">{u.icon} {u.name}</p>
                        <p className="text-[11px] text-text-muted mt-1">{u.desc}</p>
                        <p className="text-[12px] font-bold text-amber-500 mt-2">{locked ? `🔒 Stage ${u.requiredStage}` : `🪙 ${formatNumber(u.cost)}`}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">Investments</p>
              <div className="space-y-3">
                {catalog.generators.map((g) => {
                  const owned = state.generators[g.id] || 0;
                  const locked = g.requiredStage > stage;
                  const cost = genCost(g, owned, catalog.costGrowth);
                  const affordable = !locked && state.gameCoins >= cost;
                  return (
                    <button key={g.id} type="button" onClick={() => buyGenerator(g)} disabled={!affordable}
                      className={`w-full p-4 rounded-xl border bg-surface-body flex items-center justify-between gap-4 text-left transition-all ${affordable ? 'border-amber-400/50 hover:-translate-y-0.5 hover:shadow-lg' : locked ? 'border-line-soft opacity-70' : 'border-line-soft opacity-60 cursor-not-allowed'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-4xl shrink-0 ${owned > 0 ? '' : 'grayscale opacity-80'}`}>{locked ? '🔒' : g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-tight text-text-primary truncate">{g.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mt-1">
                            {locked ? `Unlocks at Stage ${g.requiredStage}` : `+${formatNumber(g.baseCps)}/sec each`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-amber-500">{locked ? '—' : `🪙 ${formatNumber(cost)}`}</p>
                        <p className="text-2xl font-extrabold text-text-primary/90 tabular-nums leading-none mt-1">{owned}</p>
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
