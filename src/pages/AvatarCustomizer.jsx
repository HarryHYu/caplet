import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import Avatar from '../components/Avatar';
import { AVATAR_CATALOG, DEFAULT_AVATAR_CONFIG } from '../lib/avatar';

function randomConfig() {
  const cfg = { seed: DEFAULT_AVATAR_CONFIG.seed };
  for (const cat of AVATAR_CATALOG) {
    const opts = cat.options;
    cfg[cat.key] = opts[Math.floor(Math.random() * opts.length)].value;
  }
  return cfg;
}

export default function AvatarCustomizer() {
  const [config, setConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAvatar();
        if (data?.avatarConfig) setConfig({ ...DEFAULT_AVATAR_CONFIG, ...data.avatarConfig });
        if (typeof data?.level === 'number') setLevel(data.level);
      } catch {
        /* fall back to defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pick = (key, value) => {
    setSaved(false);
    setConfig((prev) => ({ ...prev, [key]: value }));
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
        <header className="mb-12 reveal-text">
          <span className="section-kicker">Your Avatar</span>
          <h1 className="text-5xl md:text-7xl">Customize.</h1>
          <p className="mt-6 text-lg text-text-muted font-medium max-w-xl">
            Make it yours. Everything's free for now — soon you'll earn coins to unlock more.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Preview */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 flex flex-col items-center gap-6 border border-line-soft bg-surface-raised p-8">
              <Avatar config={config} size={200} level={level} showLevel={level != null} />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfig(randomConfig())}
                  className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  🎲 Shuffle
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(DEFAULT_AVATAR_CONFIG)}
                  className="text-[10px] font-bold uppercase tracking-widest text-text-dim border border-line-soft px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  Reset
                </button>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Avatar'}
              </button>
              {error && (
                <p className="text-[11px] text-rose-400 uppercase tracking-wider font-bold text-center">{error}</p>
              )}
              <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-accent">
                ← Back to dashboard
              </Link>
            </div>
          </div>

          {/* Option pickers */}
          <div className="lg:col-span-8 space-y-10">
            {AVATAR_CATALOG.map((cat) => (
              <div key={cat.key}>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">{cat.label}</p>
                {cat.type === 'color' ? (
                  <div className="flex flex-wrap gap-3">
                    {cat.options.map((opt) => {
                      const active = config[cat.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => pick(cat.key, opt.value)}
                          title={opt.label}
                          aria-label={opt.label}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${active ? 'border-accent scale-110' : 'border-line-soft hover:scale-105'}`}
                          style={{ backgroundColor: `#${opt.value}` }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((opt) => {
                      const active = config[cat.key] === opt.value;
                      return (
                        <button
                          key={opt.value || 'none'}
                          type="button"
                          onClick={() => pick(cat.key, opt.value)}
                          className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 border transition-colors ${active ? 'border-accent text-accent bg-accent/5' : 'border-line-soft text-text-muted hover:border-text-dim'}`}
                        >
                          {opt.label}
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
