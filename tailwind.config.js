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
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Monochrome Scale
        black: '#000000',
        white: '#FFFFFF',
        zinc: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        dim: '#71717A',
        // Highlight Blue
        brand: {
          DEFAULT: '#0066FF',
          light: '#3385FF',
          dark: '#0052CC',
          soft: 'rgba(0, 102, 255, 0.05)',
        },
        // Support for established component patterns
        accent: {
          DEFAULT: '#0066FF',
          light: '#3385FF',
          dark: '#0052CC',
        },
      },
      boxShadow: {
        'minimal': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'minimal-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(0, 102, 255, 0.15)',
      },
      borderRadius: {
        'none': '0',
        'sm': '1px',
        'DEFAULT': '2px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'progress-indefinite': 'progress-indefinite 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'progress-indefinite': {
          '0%': { transform: 'translateX(-100%) scaleX(0.2)' },
          '50%': { transform: 'translateX(0%) scaleX(0.5)' },
          '100%': { transform: 'translateX(100%) scaleX(0.2)' },
        },
      },
    },
  },
  plugins: [],
}
