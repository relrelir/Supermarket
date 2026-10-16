import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/Supermarket/").
// The Android build uses relative paths.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  build: { chunkSizeWarningLimit: 1200 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'רשימת קניות משפחתית',
        short_name: 'קניות',
        description: 'רשימת קניות משותפת לכל המשפחה',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#16a34a',
        background_color: '#f7f7f5',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
