// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  // IMPORTANTE: rutas explícitas y completas para que el purge funcione en Netlify
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    // Ruta absoluta adicional como fallback para entornos CI
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Forzar que ciertas clases nunca sean purgadas (las usadas dinámicamente)
  safelist: [
    // Status badges - construidas con template literals en runtime
    'status-live',
    'status-finished',
    'status-scheduled',
    'status-locked',
    // Phase badges con colores dinámicos
    'bg-red-500/20', 'text-red-400', 'border-red-500/30',
    'bg-green-500/20', 'text-green-400', 'border-green-500/30',
    'bg-blue-500/20', 'text-blue-400', 'border-blue-500/30',
    'bg-gray-500/20', 'text-gray-400', 'border-gray-500/30',
    // Puntos
    'points-exact', 'points-winner', 'points-zero',
    // Bordes dinámicos del panel admin
    'border-green-500/20', 'border-red-500/20',
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

export default config
