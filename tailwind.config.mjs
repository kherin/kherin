/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        f1: {
          black:    '#0A0A0A',
          dark:     '#111111',
          card:     '#161616',
          border:   '#1F1F1F',
          red:      '#E10600',
          'red-dark': '#C00000',
          'red-glow': 'rgba(225,6,0,0.35)',
          white:    '#FFFFFF',
          silver:   '#C0C0C0',
          grey:     '#A0A0A0',
          'grey-dark': '#4A4A4A',
        },
      },
      fontFamily: {
        display:  ['Bebas Neue', 'Impact', 'Arial Narrow', 'sans-serif'],
        heading:  ['Barlow Condensed', 'Arial Narrow', 'sans-serif'],
        body:     ['Inter', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'speed-in':  'speedIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-up':   'fadeUp 0.5s ease forwards',
        'blink':     'blink 1s step-end infinite',
        'scan':      'scan 3s linear infinite',
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
        'stripe':    'stripe 8s linear infinite',
      },
      keyframes: {
        speedIn: {
          '0%':   { opacity: '0', transform: 'translateX(-60px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(225,6,0,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(225,6,0,0)' },
        },
        stripe: {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '60px 0' },
        },
      },
      backgroundImage: {
        'carbon': `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6L6 0L12 6L6 12Z' fill='%23161616' stroke='%231A1A1A' stroke-width='0.5'/%3E%3C/svg%3E")`,
        'grid-dark': `linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'carbon': '12px 12px',
        'grid-dark': '40px 40px',
      },
      boxShadow: {
        'red-glow':   '0 0 20px rgba(225,6,0,0.4), 0 0 60px rgba(225,6,0,0.15)',
        'red-sm':     '0 0 8px rgba(225,6,0,0.5)',
        'card':       '0 4px 24px rgba(0,0,0,0.6)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(225,6,0,0.3)',
      },
      transitionTimingFunction: {
        'f1': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
