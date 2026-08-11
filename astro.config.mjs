import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const githubAppSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isBuild = process.argv.includes('build');
const mode = process.env.NODE_ENV === 'production' || isBuild ? 'production' : 'development';
const env = loadEnv(mode, process.cwd(), '');
const githubAppSlug = env.PUBLIC_KEYSTATIC_GITHUB_APP_SLUG;

if (isBuild && !githubAppSlugPattern.test(githubAppSlug ?? '')) {
  throw new Error(
    'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG is required at build time and must be a lowercase GitHub App slug.',
  );
}

export default defineConfig({
  site: 'https://kherin.com',
  security: {
    allowedDomains: [{ hostname: 'kherin.com', protocol: 'https' }],
  },
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), keystatic()],
  vite: {
    plugins: [tailwindcss()],
  },
});
