// CSS-var token with a working alpha channel: `<alpha-value>` is Tailwind's
// literal opacity placeholder, so `bg-accent/40` compiles to a color-mix at
// 40% and bare `bg-accent` to 100% (== var(--accent)).
const tokenColor = (cssVar) => `color-mix(in srgb, var(${cssVar}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Global type system: Bricolage display + Hanken body, with Lora as a
        // serif-italic accent and JetBrains Mono for code/data.
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        serif: ['"Lora"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        hanken: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        hand: ['"Shantell Sans"', 'ui-rounded', 'cursive'],
      },
      colors: {
        // Design system tokens — CSS variable backed (see src/index.css).
        // All colors used in the app go through these tokens so dark mode
        // is automatic and the palette can be changed in one place.
        // Wrapped in color-mix so opacity modifiers work: a bare `var(--x)`
        // gives Tailwind no alpha channel, which silently DROPPED every
        // `bg-accent/40`-style class (334 call sites) from the build.
        accent: {
          DEFAULT: tokenColor('--accent'),
          strong: tokenColor('--accent-strong'),
          soft: tokenColor('--accent-soft'),
          contrast: tokenColor('--accent-contrast'),
        },
        surface: {
          body: tokenColor('--surface-body'),
          soft: tokenColor('--surface-soft'),
          raised: tokenColor('--surface-raised'),
          inverse: tokenColor('--surface-inverse'),
          error: tokenColor('--surface-error'),
          warning: tokenColor('--surface-warning'),
        },
        text: {
          primary: tokenColor('--text-primary'),
          muted: tokenColor('--text-muted'),
          dim: tokenColor('--text-dim'),
          contrast: tokenColor('--text-contrast'),
          error: tokenColor('--text-error'),
          warning: tokenColor('--text-warning'),
        },
        line: {
          soft: tokenColor('--line-soft'),
          strong: tokenColor('--line-strong'),
          error: tokenColor('--border-error'),
          warning: tokenColor('--border-warning'),
        },
      },
      letterSpacing: {
        ultra: '-0.05em',
      },
      boxShadow: {
        minimal: '0 1px 3px rgba(0, 0, 0, 0.05)',
        'minimal-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
        glow: '0 0 20px var(--accent-soft)',
        // Canonical elevation trio — use these instead of arbitrary
        // shadow-[…] literals (the audit found 72 distinct ones; `card`
        // alone replaces a literal repeated 133 times).
        card: '0 24px 50px -34px rgba(20, 20, 18, 0.3)',
        'card-hover': '0 18px 40px -24px rgba(20, 20, 18, 0.35)',
        pop: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        // Distinct ladder: without these, xl (16px) rendered identically to
        // Tailwind's default 2xl (16px) — two class names, one radius.
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'progress-indefinite': 'progress-indefinite 2s linear infinite',
        'card-in': 'card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'caplet-logo-twist': 'capletLogoTwist 2s ease-in-out infinite',
        'msg-in': 'msg-in 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dot-bounce': 'dot-bounce 1.1s ease-in-out infinite',
        'dot-wave': 'dot-wave 1.3s ease-in-out infinite',
        'status-pulse': 'status-pulse 2.4s ease-in-out infinite',
        'slide-card-enter': 'slide-card-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        // Shared micro-interaction kit — use these instead of ad-hoc
        // animate-[…] literals so motion feels consistent site-wide.
        rise: 'rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'rise-slow': 'rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 0.25s ease-out both',
        tada: 'tada 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shake-x': 'shake-x 0.3s ease-in-out',
        'streak-pop': 'streak-pop 0.25s ease-out both',
        'caret-blink': 'caret-blink 1.1s ease-in-out infinite',
        // Scene animations. The orbit (mirror-ball reflections circling the
        // room) stays under the ≤15°/s rotation cap via its 24s duration
        // floor; lens blinks and beam fades run ≥1.6s / ≥2.8s cycles.
        'party-orbit': 'hypno-spin 44s linear infinite',
        'party-lens': 'party-lens 4.2s ease-in-out infinite',
        'party-beamfade': 'party-beamfade 6.5s ease-in-out infinite',
        'party-rock': 'party-rock 7.5s ease-in-out infinite',
        'party-rock-rev': 'party-rock 9.5s ease-in-out infinite reverse',
        'party-twinkle': 'party-twinkle 2.6s ease-in-out infinite',
        'party-confetti': 'party-confetti 13s linear infinite',
        'party-ball': 'party-ball 14s linear infinite',
        'party-drop': 'party-drop 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'party-burst': 'party-burst 0.7s ease-out both',
        'scene-veil': 'scene-veil 5.2s ease-in-out both',
        'scene-veil-line': 'scene-veil-line 5.2s ease-in-out both',
        'ink-splat': 'ink-splat 7s ease-out both',
        'bomb-smoke': 'bomb-smoke 6s ease-in-out both',
        'money-float': 'money-float 0.9s ease-out both',
        'bar-fill': 'bar-fill 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        'progress-indefinite': {
          '0%': { transform: 'translateX(-100%) scaleX(0.2)' },
          '50%': { transform: 'translateX(0%) scaleX(0.5)' },
          '100%': { transform: 'translateX(100%) scaleX(0.2)' },
        },
        'card-in': {
          '0%': { opacity: '0', transform: 'translateX(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        capletLogoTwist: {
          '0%, 100%': { transform: 'rotateY(0deg) rotateZ(0deg)' },
          '25%': { transform: 'rotateY(90deg) rotateZ(-5deg)' },
          '50%': { transform: 'rotateY(180deg) rotateZ(0deg)' },
          '75%': { transform: 'rotateY(270deg) rotateZ(5deg)' },
        },
        'msg-in': {
          '0%': { opacity: '0', transform: 'translateY(7px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'dot-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-5px)' },
        },
        'dot-wave': {
          '0%, 80%, 100%': { transform: 'scaleY(0.45)', opacity: '0.3' },
          '40%': { transform: 'scaleY(1)', opacity: '1' },
        },
        'status-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
        'slide-card-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        tada: {
          '0%': { transform: 'scale(0.8) rotate(-4deg)', opacity: '0' },
          '40%': { transform: 'scale(1.12) rotate(3deg)', opacity: '1' },
          '65%': { transform: 'scale(0.96) rotate(-1deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'shake-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'streak-pop': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '55%, 95%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'hypno-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'party-twinkle': {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.8)' },
          '50%': { opacity: '0.7', transform: 'scale(1.25)' },
        },
        // A PAR can's lens: a punchy blink, but the lens is a dot — far
        // under the flash area threshold — and every can is staggered.
        'party-lens': {
          '0%, 100%': { opacity: '0.25' },
          '10%': { opacity: '1' },
          '32%': { opacity: '0.35' },
        },
        'party-beamfade': {
          '0%, 100%': { opacity: '0.22' },
          '50%': { opacity: '0.85' },
        },
        'party-rock': {
          '0%, 100%': { transform: 'rotate(-16deg)' },
          '50%': { transform: 'rotate(16deg)' },
        },
        'party-confetti': {
          '0%': { transform: 'translateY(-12vh) rotate(0deg)' },
          '100%': { transform: 'translateY(112vh) rotate(520deg)' },
        },
        // Facet strip is 3x the ball and the pattern repeats every third, so
        // sliding one third loops seamlessly.
        'party-ball': {
          to: { transform: 'translateX(33.333%)' },
        },
        'party-drop': {
          '0%': { transform: 'translateY(-16vh)' },
          '62%': { transform: 'translateY(1.2vh)' },
          '82%': { transform: 'translateY(-0.6vh)' },
          '100%': { transform: 'translateY(0)' },
        },
        'party-burst': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--bx), var(--by)) scale(0.4)', opacity: '0' },
        },
        // Study Party sabotage. Ink splats on, drips, dries off; the bomb's
        // smoke is one slow blur fade. Neither is a luminance strobe.
        'ink-splat': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '7%': { opacity: '0.95', transform: 'scale(1.05)' },
          '14%': { transform: 'scale(1)' },
          '75%': { opacity: '0.9', transform: 'scale(1) translateY(2vh)' },
          '100%': { opacity: '0', transform: 'scale(1.02) translateY(5vh)' },
        },
        'bomb-smoke': {
          '0%': { opacity: '0' },
          '8%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // Tycoon: earned dollars drift up off the typewriter and evaporate.
        'money-float': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.85)' },
          '18%': { opacity: '1', transform: 'translateY(0) scale(1.05)' },
          '100%': { opacity: '0', transform: 'translateY(-44px) scale(1)' },
        },
        // The Focus entry ritual: a veil that holds, then lifts — identical
        // every time, because constancy is what makes a ritual a cue.
        'scene-veil': {
          '0%': { opacity: '1' },
          '55%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scene-veil-line': {
          '0%': { opacity: '0' },
          '16%': { opacity: '1' },
          '66%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'bar-fill': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
