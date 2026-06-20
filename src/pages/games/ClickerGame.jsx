import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';

/* ---------- formatting + pure helpers ---------- */
const UNITS = [['', 0], ['million', 6], ['billion', 9], ['trillion', 12], ['quadrillion', 15], ['quintillion', 18], ['sextillion', 21], ['septillion', 24], ['octillion', 27]];
function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  if (n > 0 && n < 1) return n.toFixed(1);
  if (n < 1e6) return Math.floor(n).toLocaleString('en-US');
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const p = Math.pow(10, UNITS[i][1]);
    if (n >= p) return `${(n / p).toFixed(3).replace(/\.?0+$/, '')} ${UNITS[i][1] ? UNITS[i][0] : ''}`.trim();
  }
  return String(Math.floor(n));
}
function genCost(gen, owned, growth) { return Math.ceil(gen.baseCost * Math.pow(growth, owned)); }
function clickPower(state, catalog) {
  let m = 1;
  for (const u of catalog.upgrades) if (state.upgrades.includes(u.id) && u.effect.type === 'click_mult') m *= u.effect.value;
  return m;
}
function coinsPerSec(state, catalog) {
  let mult = 1;
  for (const u of catalog.upgrades) if (state.upgrades.includes(u.id) && u.effect.type === 'cps_mult') mult *= u.effect.value;
  let cps = 0;
  for (const g of catalog.generators) cps += g.baseCps * (state.generators[g.id] || 0) * mult;
  return cps;
}
function milestone(total) {
  if (total < 50) return 'Earn your first coins!';
  if (total < 1000) return '🥉 Penny pincher';
  if (total < 1e5) return '🥈 Savvy saver';
  if (total < 1e7) return '🥇 Smart investor';
  if (total < 1e10) return '👑 Wealth tycoon';
  return '🌌 Master of the markets';
}
const NEWS = [
  'Markets rally as a mysterious new investor floods the economy with coins.',
  'Economists baffled by record household savings rates.',
  'Local piggy bank reportedly outperforming several hedge funds.',
  'Compound interest declared "the eighth wonder of the world" — again.',
  'Property prices climb as demand for tiny digital houses surges.',
  'Index funds quietly do their thing while everyone else panics.',
  'Breaking: clicking confirmed 100% effective at generating wealth.',
  'Central bank "keeping an eye" on your suspiciously fast portfolio.',
  'Term deposits make a comeback; thrill-seekers unimpressed.',
  'Bonds: still boring, still reliable, analysts confirm.',
];

/* ---------- component ---------- */
export default function ClickerGame() {
  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState(NEWS[0]);
  const [toast, setToast] = useState('');
  const [tip, setTip] = useState(null); // {gen, x, y}
  const [bonus, setBonus] = useState(null); // {x,y}

  const stateRef = useRef(null);
  const coinRef = useRef(null);
  const wrapRef = useRef(null);
  const toastT = useRef(null);

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
        const s = { gameCoins: 0, total: 0, generators: {}, upgrades: [], totalClicks: 0, goldClicks: 0, lastSaved: Date.now(), ...data.state };
        const elapsed = Math.min(Math.max(0, (Date.now() - (s.lastSaved || Date.now())) / 1000), cat.offlineCapSeconds);
        const earned = coinsPerSec(s, cat) * elapsed;
        s.gameCoins += earned; s.total += earned; s.lastSaved = Date.now();
        setState(s);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 1800);
  }, []);

  const save = useCallback(async (silent) => {
    const s = stateRef.current;
    if (!s) return;
    await api.saveGame('clicker', { ...s, lastSaved: Date.now() }).catch(() => {});
    if (!silent) showToast('Progress saved! 💾');
  }, [showToast]);

  /* idle loop */
  useEffect(() => {
    if (!catalog) return undefined;
    const id = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const gain = coinsPerSec(prev, catalog) * 0.1;
        return gain > 0 ? { ...prev, gameCoins: prev.gameCoins + gain, total: prev.total + gain } : prev;
      });
    }, 100);
    return () => clearInterval(id);
  }, [catalog]);

  /* autosave + save on leave */
  useEffect(() => {
    if (loading) return undefined;
    const id = setInterval(() => save(true), 30000);
    const onLeave = () => save(true);
    window.addEventListener('beforeunload', onLeave);
    return () => { clearInterval(id); window.removeEventListener('beforeunload', onLeave); save(true); };
  }, [loading, save]);

  /* news rotation */
  useEffect(() => {
    const id = setInterval(() => setNews(NEWS[Math.floor(Math.random() * NEWS.length)]), 9000);
    return () => clearInterval(id);
  }, []);

  /* golden bonus coin */
  useEffect(() => {
    if (loading) return undefined;
    let t;
    const schedule = () => { t = setTimeout(() => { setBonus({ x: 12 + Math.random() * 70, y: 22 + Math.random() * 55 }); t = setTimeout(() => setBonus(null), 11000); schedule(); }, 45000 + Math.random() * 55000); };
    schedule();
    return () => clearTimeout(t);
  }, [loading]);

  /* click fx (imperative, original) */
  const spawnFx = (text) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const cx = r.width / 2; const cy = r.height / 2;
    const f = document.createElement('div');
    f.className = 'cc-float'; f.textContent = text;
    f.style.left = `${cx}px`; f.style.top = `${cy}px`;
    wrap.appendChild(f);
    setTimeout(() => f.remove(), 1000);
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('div');
      c.className = 'cc-spark';
      const sz = 4 + Math.random() * 6;
      c.style.cssText = `width:${sz}px;height:${sz}px;left:${cx}px;top:${cy}px`;
      wrap.appendChild(c);
      const ang = Math.random() * Math.PI * 2; const dist = 40 + Math.random() * 80;
      c.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist + 50}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.3,.7,.4,1)' });
      setTimeout(() => c.remove(), 900);
    }
  };

  const clickCoin = () => {
    const power = clickPower(stateRef.current, catalog);
    setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + power, total: prev.total + power, totalClicks: prev.totalClicks + 1 } : prev));
    if (coinRef.current) { coinRef.current.classList.remove('cc-pop'); void coinRef.current.offsetWidth; coinRef.current.classList.add('cc-pop'); }
    spawnFx(`+${fmt(power)}`);
  };

  const claimBonus = () => {
    const s = stateRef.current;
    const reward = Math.floor(Math.max(clickPower(s, catalog) * 50, coinsPerSec(s, catalog) * 40, 50));
    setState((prev) => (prev ? { ...prev, gameCoins: prev.gameCoins + reward, total: prev.total + reward, goldClicks: prev.goldClicks + 1 } : prev));
    setBonus(null);
    showToast(`Bonus! +${fmt(reward)} 🪙`);
  };

  const buyGen = (g) => {
    setState((prev) => {
      if (!prev || g.requiredStage > stage) return prev;
      const owned = prev.generators[g.id] || 0;
      const cost = genCost(g, owned, catalog.costGrowth);
      if (prev.gameCoins < cost) { showToast("Not enough coins for that."); return prev; }
      return { ...prev, gameCoins: prev.gameCoins - cost, generators: { ...prev.generators, [g.id]: owned + 1 } };
    });
  };
  const buyUpgrade = (u) => {
    setState((prev) => {
      if (!prev || prev.upgrades.includes(u.id) || u.requiredStage > stage || prev.gameCoins < u.cost) return prev;
      return { ...prev, gameCoins: prev.gameCoins - u.cost, upgrades: [...prev.upgrades, u.id] };
    });
  };
  const reset = () => {
    if (!window.confirm('Reset ALL game progress? This cannot be undone.')) return;
    setState({ gameCoins: 0, total: 0, generators: {}, upgrades: [], totalClicks: 0, goldClicks: 0, lastSaved: Date.now() });
    setTimeout(() => save(true), 50);
    showToast('Fresh start! 🪙');
  };

  if (loading || !state || !catalog) {
    return <div className="min-h-screen bg-surface-body flex items-center justify-center"><CapletLoader message="Loading Compound…" /></div>;
  }

  const cps = coinsPerSec(state, catalog);
  const buildingsOwned = catalog.generators.reduce((s, g) => s + (state.generators[g.id] || 0), 0);
  const ns = meta.nextStage;
  const availUpgrades = catalog.upgrades.filter((u) => !state.upgrades.includes(u.id));

  return (
    <div className="cc-root">
      <style>{`
        .cc-root{--cc-gold:#f6d869;--cc-gold-deep:#e0a93b;--cc-cream:#fff5dd;--cc-line:#6b4a2f;
          color:var(--cc-cream);background:#1a0f0a;min-height:100vh;}
        .cc-game{display:grid;grid-template-columns:minmax(320px,1fr) minmax(300px,1.6fr) minmax(290px,1.1fr);min-height:100vh;}
        @media(max-width:900px){.cc-game{grid-template-columns:1fr;min-height:0}}
        /* left */
        .cc-left{position:relative;display:flex;flex-direction:column;align-items:center;overflow:hidden;
          background:radial-gradient(120% 60% at 50% -10%, #2bb6e6, #1f8fd1 38%, #0f5e9c 100%);border-right:3px solid #000;}
        .cc-left::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(80% 70% at 50% 40%, transparent 55%, rgba(0,0,0,.35))}
        .cc-bank{position:relative;z-index:3;text-align:center;padding:90px 16px 12px;width:100%;text-shadow:0 2px 0 #000,0 0 18px rgba(0,0,0,.6)}
        .cc-count{font-family:Lora,serif;font-weight:900;font-size:clamp(26px,3.2vw,40px);font-style:italic}
        .cc-cpsline{margin-top:4px;font-size:13px;font-weight:700;opacity:.95}
        .cc-coinwrap{position:relative;z-index:3;flex:1;width:100%;display:flex;align-items:center;justify-content:center;min-height:300px}
        .cc-coin{width:min(58%,290px);aspect-ratio:1;cursor:pointer;filter:drop-shadow(0 14px 22px rgba(0,0,0,.5));transition:transform .06s ease;will-change:transform}
        .cc-coin:active{transform:scale(.95)}
        .cc-coin.cc-pop{animation:ccpop .14s ease}
        @keyframes ccpop{0%{transform:scale(.9)}60%{transform:scale(1.05)}100%{transform:scale(1)}}
        .cc-glow{position:absolute;width:min(74%,360px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,238,170,.55),rgba(255,238,170,0) 65%);z-index:2;pointer-events:none;animation:ccbreathe 4s ease-in-out infinite}
        @keyframes ccbreathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.08);opacity:1}}
        .cc-float{position:absolute;z-index:6;pointer-events:none;font-weight:900;font-size:22px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.7);transform:translate(-50%,0);animation:ccfloat 1s ease-out forwards}
        @keyframes ccfloat{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-90px) scale(1.25)}}
        .cc-spark{position:absolute;z-index:5;border-radius:2px;background:var(--cc-gold);pointer-events:none}
        .cc-mile{position:relative;z-index:3;width:100%;padding:10px 14px 18px;font-size:12px;opacity:.95;text-align:center;text-shadow:0 1px 2px #000;font-weight:700}
        .cc-stage{position:relative;z-index:3;width:100%;padding:0 18px 20px;text-align:center}
        .cc-bar{height:8px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:6px}
        .cc-bar>div{height:100%;background:var(--cc-gold);transition:width .6s}
        /* mid */
        .cc-mid{position:relative;background:linear-gradient(rgba(20,12,8,.82),rgba(20,12,8,.82)),repeating-linear-gradient(45deg,#3a2415 0 22px,#341f12 22px 44px);border-right:3px solid #000;display:flex;flex-direction:column;padding-top:80px}
        .cc-title{font-family:Lora,serif;font-weight:900;font-style:italic;text-align:center;font-size:clamp(30px,3.6vw,48px);color:var(--cc-gold);padding:6px 10px;text-shadow:0 3px 0 #000,0 6px 14px rgba(0,0,0,.6)}
        .cc-sub{text-align:center;font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.65;margin-bottom:14px}
        .cc-news{margin:0 18px;background:rgba(255,245,221,.95);color:#5a3b1c;border:2px solid #000;border-radius:10px;padding:12px 16px;font-style:italic;font-weight:700;font-size:13px;min-height:46px;display:flex;align-items:center}
        .cc-stats{margin:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .cc-stat{background:rgba(0,0,0,.32);border:2px solid var(--cc-line);border-radius:10px;padding:10px 12px}
        .cc-stat .k{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;opacity:.65}
        .cc-stat .v{font-size:19px;font-weight:900;color:var(--cc-gold);font-family:Lora,serif}
        .cc-actions{margin:auto 18px 24px;display:flex;gap:10px}
        .cc-btn{flex:1;font-weight:800;font-size:12px;letter-spacing:.5px;color:var(--cc-cream);background:linear-gradient(#5a3a22,#3c2616);border:2px solid #000;border-radius:9px;padding:11px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.15)}
        .cc-btn:hover{filter:brightness(1.15)}
        .cc-btn:active{transform:translateY(1px)}
        .cc-bonus{position:absolute;z-index:30;width:74px;height:74px;cursor:pointer;filter:drop-shadow(0 0 16px rgba(255,215,90,.9));animation:ccgwob 3s ease-in-out infinite}
        @keyframes ccgwob{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
        .cc-toast{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:40;background:linear-gradient(var(--cc-gold),var(--cc-gold-deep));color:#3a2412;font-weight:900;padding:10px 18px;border:2px solid #000;border-radius:30px;box-shadow:0 6px 18px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}
        .cc-toast.show{opacity:1;transform:translateX(-50%) translateY(-6px)}
        /* store */
        .cc-store{background:linear-gradient(#1f140d,#2a190f);overflow-y:auto;max-height:100vh;border-left:3px solid #000}
        .cc-shead{position:sticky;top:0;z-index:5;background:#120b07;text-align:center;font-family:Lora,serif;font-style:italic;font-weight:900;font-size:20px;color:var(--cc-gold);padding:14px;border-bottom:3px solid #000;padding-top:90px}
        .cc-slabel{padding:10px 14px 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.5;font-weight:800}
        .cc-item{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(0,0,0,.5);cursor:pointer;background:linear-gradient(90deg,rgba(255,255,255,.02),transparent);transition:background .12s}
        .cc-item:hover{background:rgba(246,216,105,.08)}
        .cc-item.locked{opacity:.45;filter:grayscale(.6);cursor:not-allowed}
        .cc-item.afford .cc-price{color:#9be37a}
        .cc-item.broke .cc-price{color:#e98b7a}
        .cc-ic{width:54px;height:54px;display:grid;place-items:center;font-size:30px;background:radial-gradient(circle at 40% 30%,#4a3120,#2a1a10);border:2px solid #000;border-radius:12px;box-shadow:inset 0 0 8px rgba(0,0,0,.6)}
        .cc-name{font-weight:900;font-size:15px;color:var(--cc-cream)}
        .cc-price{font-weight:800;font-size:13px;margin-top:2px}
        .cc-desc{font-size:10px;opacity:.55;margin-top:2px}
        .cc-owned{font-family:Lora,serif;font-weight:900;font-size:26px;color:rgba(255,255,255,.18)}
        .cc-store::-webkit-scrollbar{width:10px}.cc-store::-webkit-scrollbar-track{background:#120b07}.cc-store::-webkit-scrollbar-thumb{background:#5a3a22;border-radius:6px}
        .cc-tip{position:fixed;z-index:100;max-width:240px;background:var(--cc-cream);color:#3a2412;border:2px solid #000;border-radius:10px;padding:10px 12px;font-size:12px;pointer-events:none;box-shadow:0 10px 24px rgba(0,0,0,.5)}
        .cc-tip h4{font-family:Lora,serif;font-style:italic;font-size:14px;margin-bottom:4px}
        .cc-tip .e{font-weight:800;color:#8a5a2a;margin:4px 0}
        .cc-tip .d{font-style:italic;opacity:.8}
      `}</style>

      {tip && (
        <div className="cc-tip" style={{ left: tip.x, top: tip.y }}>
          <h4>{tip.gen.icon} {tip.gen.name}</h4>
          <div className="e">Cost: 🪙 {fmt(tip.cost)}</div>
          <div>Each makes <b>{tip.gen.baseCps}</b>/sec · You own <b>{state.generators[tip.gen.id] || 0}</b></div>
          <div className="d">&quot;{tip.gen.desc}&quot;</div>
        </div>
      )}

      <div className="cc-game">
        {/* LEFT — the coin */}
        <section className="cc-left">
          <div className="cc-bank">
            <div className="cc-count">{fmt(state.gameCoins)} coins</div>
            <div className="cc-cpsline">per second: {fmt(cps)}</div>
          </div>
          <div className="cc-coinwrap" ref={wrapRef}>
            <div className="cc-glow" />
            <svg className="cc-coin" ref={coinRef} viewBox="0 0 200 200" onClick={clickCoin} role="button" aria-label="Tap to earn coins">
              <defs>
                <radialGradient id="ccGold" cx="38%" cy="32%" r="75%">
                  <stop offset="0%" stopColor="#fdeba6" /><stop offset="55%" stopColor="#f1c44d" /><stop offset="100%" stopColor="#b9810f" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="92" fill="url(#ccGold)" stroke="#8a5f12" strokeWidth="4" />
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
              <text x="100" y="132" textAnchor="middle" fontSize="96" fontFamily="Georgia, serif" fontWeight="bold" fill="#8a5f12">$</text>
            </svg>
          </div>
          <div className="cc-stage">
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--cc-gold)' }}>Stage {stage} / {meta.maxStage}</div>
            <div className="cc-bar"><div style={{ width: `${ns ? Math.min(100, Math.max(0, ((meta.lessonsCompleted - (catalog.stageThresholds[stage - 1] || 0)) / (ns.at - (catalog.stageThresholds[stage - 1] || 0))) * 100)) : 100}%` }} /></div>
            <div style={{ fontSize: 11, opacity: .9, marginTop: 6 }}>
              {ns ? <>Complete <b>{ns.lessonsNeeded}</b> more lesson{ns.lessonsNeeded === 1 ? '' : 's'} → <b>Stage {ns.stage}</b></> : 'Max stage reached 🎉'}
            </div>
          </div>
          <div className="cc-mile">{milestone(state.total)}</div>
        </section>

        {/* MIDDLE */}
        <section className="cc-mid">
          <div className="cc-title">{game?.title || 'Compound'}</div>
          <div className="cc-sub">grow your fortune</div>
          <div className="cc-news">{news}</div>
          <div className="cc-stats">
            <div className="cc-stat"><div className="k">Coins earned (all time)</div><div className="v">{fmt(state.total)}</div></div>
            <div className="cc-stat"><div className="k">Coins per tap</div><div className="v">{fmt(clickPower(state, catalog))}</div></div>
            <div className="cc-stat"><div className="k">Investments owned</div><div className="v">{buildingsOwned}</div></div>
            <div className="cc-stat"><div className="k">Bonus coins claimed</div><div className="v">{state.goldClicks}</div></div>
          </div>
          <div className="cc-actions">
            <button className="cc-btn" onClick={() => save(false)}>💾 Save</button>
            <button className="cc-btn" onClick={reset}>🗑 Reset</button>
            <Link to="/dashboard" className="cc-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>← Back</Link>
          </div>
          {bonus && (
            <svg className="cc-bonus" viewBox="0 0 200 200" style={{ left: `${bonus.x}%`, top: `${bonus.y}%` }} onClick={claimBonus} role="button" aria-label="Bonus coin">
              <defs><radialGradient id="ccBonus" cx="38%" cy="32%" r="75%"><stop offset="0%" stopColor="#fff6c4" /><stop offset="55%" stopColor="#f6d144" /><stop offset="100%" stopColor="#c98a13" /></radialGradient></defs>
              <circle cx="100" cy="100" r="92" fill="url(#ccBonus)" stroke="#a9750f" strokeWidth="5" />
              <text x="100" y="135" textAnchor="middle" fontSize="100" fontWeight="bold" fill="#a9750f">$</text>
            </svg>
          )}
          <div className={`cc-toast${toast ? ' show' : ''}`}>{toast}</div>
        </section>

        {/* RIGHT — store */}
        <aside className="cc-store">
          <div className="cc-shead">Market</div>
          {availUpgrades.length > 0 && <div className="cc-slabel">Upgrades</div>}
          {availUpgrades.map((u) => {
            const locked = u.requiredStage > stage;
            const afford = !locked && state.gameCoins >= u.cost;
            return (
              <div key={u.id} className={`cc-item ${locked ? 'locked' : afford ? 'afford' : 'broke'}`} onClick={() => !locked && buyUpgrade(u)}>
                <div className="cc-ic">{u.icon}</div>
                <div>
                  <div className="cc-name">{u.name}</div>
                  <div className="cc-price">{locked ? `🔒 Stage ${u.requiredStage}` : `🪙 ${fmt(u.cost)}`}</div>
                  <div className="cc-desc">{u.desc}</div>
                </div>
                <div className="cc-owned">★</div>
              </div>
            );
          })}
          <div className="cc-slabel">Investments</div>
          {catalog.generators.map((g) => {
            const owned = state.generators[g.id] || 0;
            const locked = g.requiredStage > stage;
            const cost = genCost(g, owned, catalog.costGrowth);
            const afford = !locked && state.gameCoins >= cost;
            return (
              <div
                key={g.id}
                className={`cc-item ${locked ? 'locked' : afford ? 'afford' : 'broke'}`}
                onClick={() => buyGen(g)}
                onMouseEnter={(e) => !locked && setTip({ gen: g, cost, x: e.clientX - 256, y: e.clientY - 40 })}
                onMouseMove={(e) => !locked && setTip((t) => (t ? { ...t, x: e.clientX - 256, y: e.clientY - 40 } : t))}
                onMouseLeave={() => setTip(null)}
              >
                <div className="cc-ic">{locked ? '🔒' : g.icon}</div>
                <div>
                  <div className="cc-name">{g.name}</div>
                  <div className="cc-price">{locked ? `Unlocks at Stage ${g.requiredStage}` : `🪙 ${fmt(cost)}`}</div>
                  <div className="cc-desc">{locked ? `Complete more lessons to unlock` : g.desc}</div>
                </div>
                <div className="cc-owned">{owned}</div>
              </div>
            );
          })}
          <div style={{ height: 24 }} />
        </aside>
      </div>
    </div>
  );
}
