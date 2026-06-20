import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import { formatNumber } from '../../lib/format';
import { derivePlots, mergePlots } from './cityPlots';

// Three.js pulls in a WebGL renderer — load the 3D map lazily so it doesn't
// weigh down the initial app bundle.
const CityMap3D = lazy(() => import('./CityMap3D'));

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
  Industrial: 'text-slate-400',
  Heritage: 'text-orange-400',
  Landmark: 'text-amber-500',
};

// Per-academy property market. Each classroom has its own independent world;
// only members of this academy can see or trade here.
export default function AcademyEstate({ classroomId }) {
  const [data, setData] = useState(null); // {capletCoins, styles, colors, layout, properties: OWNED + deeds only}
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null); // "x,y"
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  // While the map div is browser-fullscreen, only its DESCENDANTS render — so
  // the plot modal must portal INTO the fullscreen element, not document.body.
  const [fsTarget, setFsTarget] = useState(null);
  useEffect(() => {
    const onFs = () => setFsTarget(document.fullscreenElement || null);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const load = useCallback(async () => {
    const d = await api.getAcademyEstate(classroomId).catch(() => null);
    if (d) setData(d);
  }, [classroomId]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  // The server only sends OWNED rows + landmark deeds; every other plot is
  // derived locally from the plan (cells + districtGeo) — see cityPlots.js.
  const serverRows = useMemo(() => data?.properties || [], [data?.properties]);
  const derived = useMemo(
    () => (data?.layout?.districtGeo ? derivePlots(data.layout) : { list: [], byKey: new Map() }),
    [data?.layout],
  );
  const { plotAt } = useMemo(() => mergePlots(derived, serverRows), [derived, serverRows]);
  const coins = data?.capletCoins ?? 0;
  const selected = selectedKey ? plotAt(selectedKey) : null;
  const owned = serverRows.filter((p) => p.mine);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2500); };

  // Local row bookkeeping after a mutation: bought plots enter the server-row
  // list; sold non-deed plots leave it; deeds stay (unowned deeds still travel).
  const upsertRow = (row, topPatch) => setData((d) => ({
    ...d,
    ...topPatch,
    properties: [...d.properties.filter((p) => !(p.gridX === row.gridX && p.gridY === row.gridY)), row],
  }));
  const dropRow = (p, topPatch) => setData((d) => ({
    ...d,
    ...topPatch,
    properties: p.tier === 'Landmark'
      ? d.properties.map((r) => (r.gridX === p.gridX && r.gridY === p.gridY
        ? { ...r, mine: false, owner: null, purchasePrice: null, houseStyle: 'cottage', houseColor: '#cbd5e1' }
        : r))
      : d.properties.filter((r) => !(r.gridX === p.gridX && r.gridY === p.gridY)),
  }));

  const buy = async (p) => {
    setBusy(true);
    try {
      const res = await api.buyAcademyPlot(classroomId, p.gridX, p.gridY);
      upsertRow(
        { ...p, id: res.propertyId, mine: true, owner: { id: 'me', name: 'You' }, purchasePrice: p.marketValue },
        { capletCoins: res.capletCoins },
      );
      flash(`Bought ${p.name}! 🏠`);
    } catch (e) { flash(e?.message || 'Could not buy.'); } finally { setBusy(false); }
  };

  const sell = async (p) => {
    setBusy(true);
    try {
      const res = await api.sellAcademyPlot(classroomId, p.gridX, p.gridY);
      dropRow(p, { capletCoins: res.capletCoins });
      flash(`Sold ${p.name} for 🪙 ${formatNumber(res.refund)}`);
    } catch (e) { flash(e?.message || 'Could not sell.'); } finally { setBusy(false); }
  };

  const customize = async (p, patch) => {
    try {
      const res = await api.customizeAcademyPlot(classroomId, p.gridX, p.gridY, {
        houseStyle: patch.houseStyle ?? p.houseStyle,
        houseColor: patch.houseColor ?? p.houseColor,
      });
      upsertRow({ ...p, houseStyle: res.houseStyle, houseColor: res.houseColor }, {});
    } catch (e) { flash(e?.message || 'Could not customize.'); }
  };

  if (loading || !data) {
    return <div className="min-h-[40vh] flex items-center justify-center"><CapletLoader message="Loading the academy market…" /></div>;
  }

  return (
    // Full-bleed breakout: the game escapes the page column and uses the whole
    // viewport width; the map itself fills the remaining viewport height.
    <div className="pt-4 relative left-1/2 -translate-x-1/2 w-screen px-3 md:px-6">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl md:text-3xl">Academy Estates.</h2>
          <p className="hidden lg:block text-text-dim text-[11px] font-medium max-w-md">
            💡 Earn Caplet Coins by completing lessons, then invest them here. Click any plot — even the landmarks are for sale.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msg && <span className="text-[12px] font-bold text-accent mr-2">{msg}</span>}
          <div className="border border-line-soft bg-surface-raised px-3 py-1.5 text-center">
            <div className="text-[9px] font-bold uppercase tracking-widest text-text-dim">Caplet Coins</div>
            <div className="text-base font-bold text-amber-500">🪙 {formatNumber(coins)}</div>
          </div>
          <div className="border border-line-soft bg-surface-raised px-3 py-1.5 text-center">
            <div className="text-[9px] font-bold uppercase tracking-widest text-text-dim">You own</div>
            <div className="text-base font-bold text-accent">{owned.length}</div>
          </div>
          <button type="button" onClick={async () => { setBusy(true); await load(); setBusy(false); }} disabled={busy}
            className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-50">
            ⟳ Refresh
          </button>
        </div>
      </header>

      {/* 3D island map */}
      <Suspense fallback={<div className="h-[min(72vh,680px)] flex items-center justify-center border border-line-soft rounded-xl bg-surface-soft"><CapletLoader message="Loading the island…" /></div>}>
        <CityMap3D
          plots={derived.list}
          ownedRows={serverRows}
          layout={data.layout}
          selectedKey={selectedKey}
          onSelectPlot={setSelectedKey}
        />
      </Suspense>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">
        {['Luxury', 'Premium', 'Suburban', 'Starter', 'Industrial', 'Heritage', 'Landmark'].map((t) => (
          <span key={t} className={TIER_BADGE[t]}>● {t}</span>
        ))}
        <span className="text-accent">● Your property</span>
      </div>

      {/* Plot detail modal — portaled to <body>: an ancestor in the page tree
          creates a containing block (transform/filter), which traps `fixed`
          and lets the WebGL canvas swallow clicks meant for the modal. */}
      {selected && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedKey(null)}>
          <div className="relative w-full max-w-md bg-surface-body border border-line-soft rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-line-soft flex items-start justify-between gap-4">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${TIER_BADGE[selected.tier]}`}>{selected.neighborhood} · {selected.tier}</p>
                <h3 className="text-2xl font-serif italic mt-1">{selected.name}</h3>
                <p className="text-[11px] text-text-dim mt-1">Market value: <span className="font-bold text-amber-500">🪙 {formatNumber(selected.marketValue)}</span></p>
              </div>
              <span className="text-5xl">{selected.owner ? (STYLE_EMOJI[selected.houseStyle] || '🏠') : '🏞️'}</span>
            </div>

            <div className="p-6 space-y-5">
              {!selected.owner && (
                <>
                  <p className="text-sm text-text-muted">Unclaimed plot. Buy it at market value to build here.</p>
                  <button type="button" disabled={busy || coins < selected.marketValue} onClick={() => buy(selected)}
                    className="btn-primary w-full py-3 disabled:opacity-50">
                    {coins < selected.marketValue ? `Need 🪙 ${formatNumber(selected.marketValue)}` : `Buy for 🪙 ${formatNumber(selected.marketValue)}`}
                  </button>
                </>
              )}

              {selected.owner && !selected.mine && (
                <p className="text-sm text-text-muted">Owned by <span className="font-bold text-text-primary">{selected.owner.name}</span>.</p>
              )}

              {selected.mine && (
                <>
                  {selected.purchasePrice != null && (
                    <p className="text-[11px] text-text-dim">
                      You paid 🪙 {formatNumber(selected.purchasePrice)} ·{' '}
                      <span className={selected.marketValue >= selected.purchasePrice ? 'text-emerald-500' : 'text-rose-400'}>
                        {selected.marketValue >= selected.purchasePrice ? '▲' : '▼'} {formatNumber(Math.abs(selected.marketValue - selected.purchasePrice))}
                      </span>
                    </p>
                  )}
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
                  <button type="button" disabled={busy} onClick={() => { sell(selected); setSelectedKey(null); }}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest border border-rose-400/50 text-rose-400 rounded-lg hover:bg-rose-400/10 disabled:opacity-50">
                    Sell to bank (~70%: 🪙 {formatNumber(Math.floor(selected.marketValue * 0.7))})
                  </button>
                </>
              )}

              <button type="button" onClick={() => setSelectedKey(null)} className="w-full text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-primary">Close</button>
            </div>
          </div>
        </div>,
        fsTarget || document.body,
      )}
    </div>
  );
}
