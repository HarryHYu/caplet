import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import { formatNumber } from '../../lib/format';

const STYLE_EMOJI = {
  cottage: '🏡',
  townhouse: '🏘️',
  modern: '🏢',
  villa: '🏖️',
  mansion: '🏛️',
  castle: '🏰',
};

const TIER_BADGE = {
  Luxury: 'text-purple-500',
  Premium: 'text-blue-500',
  Suburban: 'text-emerald-500',
  Starter: 'text-text-dim',
};

export default function RealEstate() {
  const [data, setData] = useState(null); // {capletCoins, styles, colors, properties}
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const d = await api.getRealEstate().catch(() => null);
    if (d) setData(d);
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const properties = data?.properties || [];
  const coins = data?.capletCoins ?? 0;
  const selected = properties.find((p) => p.id === selectedId) || null;
  const owned = properties.filter((p) => p.mine);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2500); };

  const patchProperty = (id, patch) =>
    setData((d) => ({ ...d, ...patch.top, properties: d.properties.map((p) => (p.id === id ? { ...p, ...patch.prop } : p)) }));

  const buy = async (p) => {
    setBusy(true);
    try {
      const res = await api.buyProperty(p.id);
      patchProperty(p.id, { top: { capletCoins: res.capletCoins }, prop: { mine: true, owner: { id: 'me', name: 'You', avatarConfig: null } } });
      flash(`Bought ${p.name}! 🏠`);
    } catch (e) { flash(e?.message || 'Could not buy.'); } finally { setBusy(false); }
  };

  const sell = async (p) => {
    setBusy(true);
    try {
      const res = await api.sellProperty(p.id);
      patchProperty(p.id, { top: { capletCoins: res.capletCoins }, prop: { mine: false, owner: null, houseStyle: 'cottage', houseColor: '#cbd5e1' } });
      flash(`Sold ${p.name} for 🪙 ${formatNumber(res.refund)}`);
    } catch (e) { flash(e?.message || 'Could not sell.'); } finally { setBusy(false); }
  };

  const customize = async (p, patch) => {
    try {
      const res = await api.customizeProperty(p.id, { houseStyle: patch.houseStyle ?? p.houseStyle, houseColor: patch.houseColor ?? p.houseColor });
      patchProperty(p.id, { top: {}, prop: { houseStyle: res.houseStyle, houseColor: res.houseColor } });
    } catch (e) { flash(e?.message || 'Could not customize.'); }
  };

  if (loading || !data) {
    return <div className="min-h-screen bg-surface-body flex items-center justify-center"><CapletLoader message="Loading Caplet Estates…" /></div>;
  }

  const cols = Math.max(...properties.map((p) => p.gridX), 0) + 1;

  return (
    <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal-text">
          <div>
            <span className="section-kicker">Games · 🏘️ Caplet Estates</span>
            <h1 className="text-5xl md:text-7xl">Estates.</h1>
            <p className="mt-4 text-text-muted font-medium max-w-xl">A live property world — buy plots, build your portfolio, customize your houses. Everyone shares one map.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-line-soft bg-surface-raised px-5 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Caplet Coins</div>
              <div className="text-xl font-bold text-amber-500">🪙 {formatNumber(coins)}</div>
            </div>
            <div className="border border-line-soft bg-surface-raised px-5 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">You own</div>
              <div className="text-xl font-bold text-accent">{owned.length}</div>
            </div>
          </div>
        </header>

        <p className="text-[11px] text-text-dim mb-4">💡 Earn Caplet Coins by completing lessons, then invest them here. Click any plot.</p>
        {msg && <p className="text-[12px] font-bold text-accent mb-4">{msg}</p>}

        {/* Map */}
        <div className="overflow-x-auto border border-line-soft bg-surface-soft p-4 rounded-xl">
          <div className="grid gap-2 min-w-[640px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {properties.map((p) => {
              const affordable = coins >= p.price;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  title={`${p.name} · ${p.tier}`}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all hover:scale-[1.04] ${
                    p.mine ? 'border-accent ring-2 ring-accent/40' : p.owner ? 'border-line-soft' : affordable ? 'border-amber-400/60 border-dashed' : 'border-line-soft border-dashed'
                  }`}
                  style={{ backgroundColor: p.owner ? `${p.houseColor}22` : 'transparent' }}
                >
                  {p.owner ? (
                    <>
                      <span className="text-2xl leading-none" style={{ filter: 'saturate(1.2)' }}>{STYLE_EMOJI[p.houseStyle] || '🏠'}</span>
                      <span className="text-[8px] font-bold uppercase tracking-tight text-text-dim truncate max-w-full mt-0.5">{p.mine ? 'You' : p.owner.name.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg opacity-30">▢</span>
                      <span className={`text-[8px] font-bold ${affordable ? 'text-amber-500' : 'text-text-dim'}`}>🪙{formatNumber(p.price)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">
          {['Luxury', 'Premium', 'Suburban', 'Starter'].map((t) => (
            <span key={t} className={TIER_BADGE[t]}>● {t}</span>
          ))}
          <span className="text-accent">● Your property</span>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={async () => { setBusy(true); await load(); setBusy(false); }} disabled={busy}
            className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent disabled:opacity-50">
            ⟳ Refresh world
          </button>
          <Link to="/games" className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent">← All games</Link>
        </div>
      </div>

      {/* Plot detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedId(null)}>
          <div className="relative w-full max-w-md bg-surface-body border border-line-soft rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-line-soft flex items-start justify-between gap-4">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${TIER_BADGE[selected.tier]}`}>{selected.neighborhood} · {selected.tier}</p>
                <h3 className="text-2xl font-serif italic mt-1">{selected.name}</h3>
              </div>
              <span className="text-5xl">{selected.owner ? (STYLE_EMOJI[selected.houseStyle] || '🏠') : '🏞️'}</span>
            </div>

            <div className="p-6 space-y-5">
              {!selected.owner && (
                <>
                  <p className="text-sm text-text-muted">Unclaimed plot. Buy it with Caplet Coins to build here.</p>
                  <button type="button" disabled={busy || coins < selected.price} onClick={() => buy(selected)}
                    className="btn-primary w-full py-3 disabled:opacity-50">
                    {coins < selected.price ? `Need 🪙 ${formatNumber(selected.price)}` : `Buy for 🪙 ${formatNumber(selected.price)}`}
                  </button>
                </>
              )}

              {selected.owner && !selected.mine && (
                <p className="text-sm text-text-muted">Owned by <span className="font-bold text-text-primary">{selected.owner.name}</span>. Not for sale.</p>
              )}

              {selected.mine && (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2">House style</p>
                    <div className="flex flex-wrap gap-2">
                      {data.styles.map((s) => (
                        <button key={s} type="button" onClick={() => customize(selected, { houseStyle: s })}
                          className={`text-2xl w-12 h-12 rounded-lg border ${selected.houseStyle === s ? 'border-accent ring-2 ring-accent/40' : 'border-line-soft'}`}>
                          {STYLE_EMOJI[s] || '🏠'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      {data.colors.map((c) => (
                        <button key={c} type="button" onClick={() => customize(selected, { houseColor: c })} aria-label={c}
                          className={`w-9 h-9 rounded-full border-2 ${selected.houseColor === c ? 'border-accent scale-110' : 'border-line-soft'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => { sell(selected); setSelectedId(null); }}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest border border-rose-400/50 text-rose-400 rounded-lg hover:bg-rose-400/10 disabled:opacity-50">
                    Sell (~70% refund: 🪙 {formatNumber(Math.floor(selected.price * 0.7))})
                  </button>
                </>
              )}

              <button type="button" onClick={() => setSelectedId(null)} className="w-full text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
