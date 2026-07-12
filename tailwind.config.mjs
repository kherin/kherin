/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#0B0B0D',
          900: '#101013',
          850: '#15151A',
        },
        ink: {
          DEFAULT: '#F4F1EA',
          dim:     '#9C978C',
          faint:   '#6B675E',
        },
        ember: {
          DEFAULT: '#F5A623',
          hover:   '#FFC94D',
          dim:     '#B87A18',
        },
        line: {
          DEFAULT: 'rgba(244,241,234,0.08)',
          strong:  'rgba(244,241,234,0.16)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
