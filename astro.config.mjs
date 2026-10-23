// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://nadavsrb.github.io',
  base: '/election-2026',
  trailingSlash: 'always',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
