/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:    '#03030a',
        bg1:   '#07071a',
        bg2:   '#0b0b22',
        bg3:   '#10102e',
        bg4:   '#16163a',
        accent:  '#00ffb3',
        amber:   '#f5a623',
        blue:    '#5577ff',
        red:     '#ff4466',
        green:   '#33ff88',
        purple:  '#bb88ff',
        muted:   '#b0c0cc',
        muted2:  '#506070',
        muted3:  '#283040',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono:    ['Share Tech Mono', 'monospace'],
        sans:    ['Rajdhani', 'sans-serif'],
      },
      borderColor: {
        accent: 'rgba(0,255,179,0.18)',
      },
      boxShadow: {
        glow:   '0 0 20px rgba(0,255,179,0.22)',
        'glow-sm': '0 0 10px rgba(0,255,179,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow':  'spin 20s linear infinite',
        blink:        'blink 1.2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.1' },
        },
      },
    },
  },
  plugins: [],
}
