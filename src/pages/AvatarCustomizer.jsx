import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import Avatar from '../components/Avatar';
import { DEFAULT_AVATAR_CONFIG } from '../lib/avatar';

export default function AvatarCustomizer() {
  const [config, setConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [level, setLevel] = useState(null);
  const [coins, setCoins] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [avatarData, shopData] = await Promise.all([
          api.getAvatar().catch(() => null),
          api.getShop().catch(() => null),
        ]);
        if (avatarData?.avatarConfig) setConfig({ ...DEFAULT_AVATAR_CONFIG, ...avatarData.avatarConfig });
        if (typeof avatarData?.level === 'number') setLevel(avatarData.level);
        if (typeof shopData?.coins === 'number') setCoins(shopData.coins);
        if (shopData?.catalog) setCatalog(shopData.catalog);
      } catch {
        /* defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pick = (key, value, owned) => {
    if (!owned) return; // locked — must buy in the shop first
    setSaved(false);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const randomize = () => {
    setSaved(false);
    setConfig((prev) => {
      const next = { ...prev };
      for (const cat of catalog) {
        const owned = cat.options.filter((o) => o.owned);
        if (owned.length) next[cat.key] = owned[Math.floor(Math.random() * owned.length)].value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveAvatar(config);
      setSaved(true);
    } catch (e) {
      setError(e?.message || 'Could not save your avatar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading your avatar…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal-text">
          <div>
            <span className="section-kicker">Your Avatar</span>
            <h1 className="text-5xl md:text-7xl">Customize.</h1>
            <p className="mt-6 text-lg text-text-muted font-medium max-w-xl">
              Equip anything you own. Locked items 🔒 can be unlocked in the{' '}
              <Link to="/shop" className="text-accent border-b border-accent">shop</Link>.
            </p>
          </div>
          <div className="flex items-center gap-2 border border-line-soft bg-surface-raised px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Balance</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-500">🪙 {coins}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Preview */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 flex flex-col items-center gap-6 border border-line-soft bg-surface-raised p-8">
              <Avatar config={config} size={200} level={level} showLevel={level != null} />
              <div className="flex gap-3">
                <button type="button" onClick={randomize}
                  className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent transition-colors">
                  🎲 Shuffle
                </button>
                <button type="button" onClick={() => { setSaved(false); setConfig(DEFAULT_AVATAR_CONFIG); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent transition-colors">
                  Reset
                </button>
              </div>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Avatar'}
              </button>
              {error && <p className="text-[11px] text-rose-400 uppercase tracking-wider font-bold text-center">{error}</p>}
              <Link to="/shop" className="text-[10px] font-bold uppercase tracking-widest text-accent hover:opacity-70">
                🛍️ Visit the shop →
              </Link>
            </div>
          </div>

          {/* Option pickers (from the shop catalog, with ownership) */}
          <div className="lg:col-span-8 space-y-10">
            {catalog.map((cat) => (
              <div key={cat.key}>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">{cat.label}</p>
                {cat.type === 'color' ? (
                  <div className="flex flex-wrap gap-3">
                    {cat.options.map((opt) => {
                      const active = config[cat.key] === opt.value;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => pick(cat.key, opt.value, opt.owned)}
                          title={opt.owned ? opt.label : `${opt.label} — locked (🪙 ${opt.cost})`}
                          aria-label={opt.label}
                          className={`relative w-10 h-10 rounded-full border-2 transition-all ${active ? 'border-accent scale-110' : 'border-line-soft hover:scale-105'} ${!opt.owned ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: `#${opt.value}` }}
                        >
                          {!opt.owned && <span className="absolute inset-0 flex items-center justify-center text-[11px]">🔒</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((opt) => {
                      const active = config[cat.key] === opt.value;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => pick(cat.key, opt.value, opt.owned)}
                          className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 border transition-colors ${
                            active ? 'border-accent text-accent bg-accent/5'
                              : opt.owned ? 'border-line-soft text-text-muted hover:border-text-dim'
                                : 'border-line-soft text-text-dim opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {opt.owned ? opt.label : `🔒 ${opt.label}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
