/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  safelist: [
    'status-live',
    'status-finished',
    'status-scheduled',
    'status-locked',
    'points-exact',
    'points-winner',
    'points-zero',
    'phase-badge',
    'match-card',
    'rank-row',
    'nav-active',
    'btn-primary',
    'btn-secondary',
    'score-input',
    'card',
  ],
  theme: {
    extend: {
      colors: {
        'fifa-blue': '#003087',
        'fifa-gold': '#c9a84c',
        'fifa-dark': '#0a0e1a',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out forwards',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(201, 168, 76, 0.3)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
