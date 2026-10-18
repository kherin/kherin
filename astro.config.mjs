import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kherin.com',
  security: {
    allowedDomains: [{ hostname: 'kherin.com', protocol: 'https' }],
  },
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
