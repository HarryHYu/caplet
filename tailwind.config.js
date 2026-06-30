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
          error: 'var(--surface-error)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
          contrast: 'var(--text-contrast)',
          error: 'var(--text-error)',
        },
        line: {
          soft: 'var(--line-soft)',
          strong: 'var(--line-strong)',
          error: 'var(--border-error)',
        },
      },
      letterSpacing: {
        ultra: '-0.05em',
      },
      boxShadow: {
        minimal: '0 1px 3px rgba(0, 0, 0, 0.05)',
        'minimal-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
        glow: '0 0 20px var(--accent-soft)',
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
        'msg-in': 'msg-in 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dot-bounce': 'dot-bounce 1.1s ease-in-out infinite',
        'dot-wave': 'dot-wave 1.3s ease-in-out infinite',
        'status-pulse': 'status-pulse 2.4s ease-in-out infinite',
        'slide-card-enter': 'slide-card-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
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
      },
    },
  },
  plugins: [],
}
