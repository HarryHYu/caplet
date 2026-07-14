import { CheckIcon, ComputerDesktopIcon, MoonIcon, RectangleStackIcon, SunIcon, ViewColumnsIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';

const appearanceOptions = [
  { value: 'system', label: 'System', description: 'Match this device', icon: ComputerDesktopIcon },
  { value: 'light', label: 'Light', description: 'Use your chosen background', icon: SunIcon },
  { value: 'dark', label: 'Dark', description: 'Use its darker counterpart', icon: MoonIcon },
];

const navigationOptions = [
  { value: 'vertical', label: 'Vertical bar', description: 'A roomy side rail for your workspace', icon: RectangleStackIcon },
  { value: 'horizontal', label: 'Top bar', description: 'A compact navigation bar across the page', icon: ViewColumnsIcon },
];

const paletteOptions = [
  { value: 'paper', label: 'Paper', description: 'Warm and familiar', lightColours: ['#F8F5EF', '#ECE5D6', '#1351AA'], darkColours: ['#141413', '#232220', '#5B9BF0'] },
  { value: 'white', label: 'Pure white', description: 'Clean and crisp', lightColours: ['#FFFFFF', '#F0F2F5', '#2856A3'], darkColours: ['#111418', '#1D2228', '#7DA8F0'] },
  { value: 'sky', label: 'Sky', description: 'Cool and focused', lightColours: ['#F2F7FC', '#DFEAF5', '#1B5A91'], darkColours: ['#0D1822', '#172A3A', '#78B9E8'] },
  { value: 'sage', label: 'Sage', description: 'Soft and calm', lightColours: ['#F4F8F1', '#E2EDDC', '#2E6B4A'], darkColours: ['#101A14', '#1C2D22', '#7CC69A'] },
  { value: 'rose', label: 'Rose', description: 'Warm and gentle', lightColours: ['#FCF5F7', '#F2E1E7', '#9A3D62'], darkColours: ['#1B1014', '#301C23', '#DE87A8'] },
];

export default function SettingsAppearance() {
  const { theme, setTheme, palette, setPalette, isDark } = useTheme();
  const { navMode, setNavMode } = useLayout();

  const choosePalette = (value) => {
    setPalette(value);
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
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? 'bg-accent text-text-contrast' : 'bg-surface-raised text-text-muted'}`}>
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

      <section className="mt-12 border-t border-line-soft pt-10" aria-labelledby="navigation-mode-heading">
        <div className="mb-4">
          <h3 id="navigation-mode-heading" className="font-display text-lg font-bold tracking-tight text-text-primary">Navigation layout</h3>
          <p className="mt-1 text-sm font-medium text-text-dim">Choose where your main workspace navigation lives.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Navigation layout">
          {navigationOptions.map((option) => {
            const NavigationIcon = option.icon;
            const selected = navMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setNavMode(option.value)}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${selected ? 'border-accent bg-accent-soft shadow-sm' : 'border-line-soft bg-surface-soft hover:border-accent/40'}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? 'bg-accent text-text-contrast' : 'bg-surface-raised text-text-muted'}`}>
                    <NavigationIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {selected && <CheckIcon className="h-5 w-5 text-accent" aria-hidden="true" />}
                </span>
                <span className="mt-4 block font-display text-base font-bold text-text-primary">{option.label}</span>
                <span className="mt-1 block text-xs font-medium text-text-dim">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12 border-t border-line-soft pt-10" aria-labelledby="background-palette-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="background-palette-heading" className="font-display text-lg font-bold tracking-tight text-text-primary">Background colour</h3>
            <p className="mt-1 text-sm font-medium text-text-dim">Updates backgrounds, cards, borders, and highlights throughout Caplet in both light and dark mode.</p>
          </div>
          <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-text-muted">Previewing {isDark ? 'dark' : 'light'} colours</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Background colour">
          {paletteOptions.map(({ value, label, description, lightColours, darkColours }) => {
            const selected = palette === value;
            const colours = isDark ? darkColours : lightColours;
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
                    <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-[color:var(--surface-body)] shadow-sm" style={{ backgroundColor: colours[2] }}>
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
