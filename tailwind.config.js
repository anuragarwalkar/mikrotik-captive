/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black:  '#020309',
          dark:   '#070d1a',
          card:   'rgba(6,18,42,0.6)',
          cyan:   '#00d4ff',
          blue:   '#0066ff',
          purple: '#7c3aed',
          pink:   '#f72585',
          green:  '#00ff88',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        inter:    ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan':   '0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)',
        'neon-purple': '0 0 20px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.15)',
        'neon-pink':   '0 0 20px rgba(247,37,133,0.4)',
        'neon-green':  '0 0 20px rgba(0,255,136,0.4)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':       'float 6s ease-in-out infinite',
        'scan':        'scan 4s linear infinite',
        'spin-slow':   'spin 12s linear infinite',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '1', filter: 'brightness(1)' },
          '50%':     { opacity: '0.7', filter: 'brightness(1.4)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
