/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        tcaps: {
          black:    '#0A0A0A',
          surface:  '#111111',
          s2:       '#161616',
          border:   '#222222',
          b2:       '#2A2A2A',
          gold:     '#C9A84C',
          'gold-l': '#E8C96A',
          'gold-d': '#8A7035',
          silver:   '#B8B8B8',
          text:     '#F5F5F5',
          muted:    '#6B6B6B',
          error:    '#E05252',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Bungee', 'Impact', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400% center' },
          '100%': { backgroundPosition:  '400% center' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,.5)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(201,168,76,0)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer:       'shimmer 4s linear infinite',
        'pulse-gold':  'pulseGold 2s ease-in-out infinite',
        scan:          'scan 2s ease-in-out infinite',
        'fade-in-up':  'fadeInUp .4s ease-out forwards',
        'spin-slow':   'spinSlow 3s linear infinite',
      },
    },
  },
  plugins: [],
}

module.exports = config
