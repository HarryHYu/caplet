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
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
        serif: ['"Lora"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Design system tokens — CSS variable backed (see src/index.css).
        // All colors used in the app go through these tokens so dark mode
        // is automatic and the palette can be changed in one place.
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          soft: 'var(--accent-soft)',
        },
        surface: {
          body: 'var(--surface-body)',
          soft: 'var(--surface-soft)',
          raised: 'var(--surface-raised)',
          inverse: 'var(--surface-inverse)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
          contrast: 'var(--text-contrast)',
        },
        line: {
          soft: 'var(--line-soft)',
          strong: 'var(--line-strong)',
        },
      },
      letterSpacing: {
        ultra: '-0.05em',
      },
      boxShadow: {
        minimal: '0 1px 3px rgba(0, 0, 0, 0.05)',
        'minimal-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
        glow: '0 0 20px rgba(0, 102, 255, 0.15)',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      animation: {
        'progress-indefinite': 'progress-indefinite 2s linear infinite',
        'card-in': 'card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'caplet-logo-twist': 'capletLogoTwist 2s ease-in-out infinite',
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
      },
    },
  },
  plugins: [],
}
