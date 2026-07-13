import { CheckIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const appearanceOptions = [
  { value: 'light', label: 'Light', description: 'Use your chosen background', icon: SunIcon },
  { value: 'dark', label: 'Dark', description: 'Use Caplet after dark', icon: MoonIcon },
  { value: 'system', label: 'System', description: 'Match this device', icon: ComputerDesktopIcon },
];

const paletteOptions = [
  { value: 'paper', label: 'Paper', description: 'Warm and familiar', colours: ['#F8F5EF', '#ECE5D6', '#1351AA'] },
  { value: 'white', label: 'Pure white', description: 'Clean and crisp', colours: ['#FFFFFF', '#F0F2F5', '#2856A3'] },
  { value: 'sky', label: 'Sky', description: 'Cool and focused', colours: ['#F2F7FC', '#DFEAF5', '#1B5A91'] },
  { value: 'sage', label: 'Sage', description: 'Soft and calm', colours: ['#F4F8F1', '#E2EDDC', '#2E6B4A'] },
  { value: 'rose', label: 'Rose', description: 'Warm and gentle', colours: ['#FCF5F7', '#F2E1E7', '#9A3D62'] },
];

export default function SettingsAppearance() {
  const { theme, setTheme, palette, setPalette, isDark } = useTheme();

  const choosePalette = (value) => {
    setPalette(value);
    if (isDark) setTheme('light');
  };

  return (
    <div>
      <div className="mb-10">
        <p className="mb-1 inline-block -rotate-2 font-hand text-lg text-accent">make it yours</p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">Appearance</h2>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-text-dim">
          Choose how Caplet feels across every page. Your preference is saved on this device.
        </p>
      </div>

      <section aria-labelledby="appearance-mode-heading">
        <div className="mb-4">
          <h3 id="appearance-mode-heading" className="font-display text-lg font-bold tracking-tight text-text-primary">Display mode</h3>
          <p className="mt-1 text-sm font-medium text-text-dim">Set the overall brightness of the interface.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Display mode">
          {appearanceOptions.map((option) => {
            const { value, label, description } = option;
            const ModeIcon = option.icon;
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${selected ? 'border-accent bg-accent-soft shadow-sm' : 'border-line-soft bg-surface-soft hover:border-accent/40'}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? 'bg-accent text-white' : 'bg-surface-raised text-text-muted'}`}>
                    <ModeIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {selected && <CheckIcon className="h-5 w-5 text-accent" aria-hidden="true" />}
                </span>
                <span className="mt-4 block font-display text-base font-bold text-text-primary">{label}</span>
                <span className="mt-1 block text-xs font-medium text-text-dim">{description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12 border-t border-line-soft pt-10" aria-labelledby="background-palette-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="background-palette-heading" className="font-display text-lg font-bold tracking-tight text-text-primary">Background colour</h3>
            <p className="mt-1 text-sm font-medium text-text-dim">Updates backgrounds, cards, borders, and highlights throughout Caplet.</p>
          </div>
          {isDark && <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-text-muted">Choose a colour to switch to Light</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Background colour">
          {paletteOptions.map(({ value, label, description, colours }) => {
            const selected = palette === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choosePalette(value)}
                className={`group rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 ${selected ? 'border-accent bg-accent-soft shadow-sm' : 'border-line-soft bg-surface-soft hover:border-accent/40'}`}
              >
                <span className="relative block h-24 overflow-hidden rounded-xl border border-black/5" style={{ backgroundColor: colours[0] }}>
                  <span className="absolute inset-x-3 bottom-3 top-5 rounded-lg border border-black/5 shadow-sm" style={{ backgroundColor: colours[1] }} />
                  <span className="absolute bottom-6 left-6 h-3 w-20 rounded-full bg-white/80" />
                  <span className="absolute bottom-6 right-6 h-7 w-7 rounded-full" style={{ backgroundColor: colours[2] }} />
                  {selected && (
                    <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-white shadow-sm" style={{ backgroundColor: colours[2] }}>
                      <CheckIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-3 px-1 pb-1 pt-3">
                  <span>
                    <span className="block font-display text-sm font-bold text-text-primary">{label}</span>
                    <span className="mt-0.5 block text-xs font-medium text-text-dim">{description}</span>
                  </span>
                  <span className="flex -space-x-1.5" aria-hidden="true">
                    {colours.map((colour) => <span key={colour} className="h-5 w-5 rounded-full border-2 border-surface-raised" style={{ backgroundColor: colour }} />)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
