import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '../lib/avatar';

const RARITY_COLORS = {
  common: 'text-text-dim',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
};

function CoinBalance({ coins }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-500">
      <span className="text-base">🪙</span>
      {coins}
    </span>
  );
}

export default function Shop() {
  const [coins, setCoins] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    const data = await api.getShop().catch(() => null);
    if (data) {
      setCoins(data.coins || 0);
      setCatalog(data.catalog || []);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  const handleBuy = async (item) => {
    setBuyingId(item.id);
    setError(null);
    try {
      const res = await api.purchaseItem(item.id);
      setCoins(res.coins);
      // Mark this item owned locally.
      setCatalog((prev) =>
        prev.map((cat) => ({
          ...cat,
          options: cat.options.map((o) =>
            o.id === item.id ? { ...o, owned: true } : { ...o, affordable: o.owned || res.coins >= o.cost }
          ),
        }))
      );
    } catch (e) {
      setError(e?.message || 'Purchase failed.');
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Opening the shop…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal-text">
          <div>
            <span className="section-kicker">Shop</span>
            <h1 className="text-5xl md:text-7xl">Cosmetics.</h1>
            <p className="mt-6 text-lg text-text-muted font-medium max-w-xl">
              Spend coins to unlock new looks for your avatar. Owned items can be equipped in the
              {' '}
              <Link to="/avatar" className="text-accent border-b border-accent">customizer</Link>.
            </p>
          </div>
          <div className="flex items-center gap-2 border border-line-soft bg-surface-raised px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Balance</span>
            <CoinBalance coins={coins} />
          </div>
        </header>

        {error && (
          <p className="text-[11px] text-rose-400 mb-8 uppercase tracking-wider font-bold">{error}</p>
        )}

        <div className="space-y-12">
          {catalog.map((cat) => (
            <section key={cat.key}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">{cat.label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-line-soft border border-line-soft">
                {cat.options.map((opt) => {
                  const previewConfig = { ...DEFAULT_AVATAR_CONFIG, [cat.key]: opt.value };
                  return (
                    <div key={opt.id} className="bg-surface-body p-4 flex flex-col items-center gap-3">
                      {cat.type === 'color' ? (
                        <div
                          className="w-16 h-16 rounded-full border border-line-soft"
                          style={{ backgroundColor: `#${opt.value}` }}
                        />
                      ) : (
                        <img
                          src={buildAvatarUrl(previewConfig, { size: 128 })}
                          alt={opt.label}
                          width={64}
                          height={64}
                          loading="lazy"
                          className="w-16 h-16 rounded-full border border-line-soft bg-surface-raised"
                        />
                      )}
                      <p className="text-[11px] font-bold uppercase tracking-tight text-center text-text-primary leading-tight">
                        {opt.label}
                      </p>
                      {opt.rarity && (
                        <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${RARITY_COLORS[opt.rarity] || 'text-text-dim'}`}>
                          {opt.rarity}
                        </span>
                      )}
                      {opt.owned ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                          {opt.cost === 0 ? 'Free' : '✓ Owned'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuy(opt)}
                          disabled={!opt.affordable || buyingId === opt.id}
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                            opt.affordable
                              ? 'border-accent text-accent hover:bg-accent hover:text-white'
                              : 'border-line-soft text-text-dim cursor-not-allowed'
                          }`}
                        >
                          {buyingId === opt.id ? '…' : `🪙 ${opt.cost}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
