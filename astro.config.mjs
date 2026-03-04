import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

export default defineConfig({
  site: 'https://kherin.com',
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
    keystatic(),
  ],
  vite: {
    ssr: {
      noExternal: ['three'],
    },
    optimizeDeps: {
      exclude: ['@keystatic/core'],
    },
  },
});
