import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Repo name for GitHub Pages project sites (https://<user>.github.io/kalika-pantry/)
  base: '/kalika-pantry/',
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kalika Pantry',
        short_name: 'Kalika',
        description: 'Scan-first Inventur-App für den Haushaltsvorrat',
        lang: 'de',
        theme_color: '#16171d',
        background_color: '#16171d',
        display: 'standalone',
        start_url: '/kalika-pantry/',
        scope: '/kalika-pantry/',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The app requires network access (Supabase/Open Food Facts), so we only
        // precache the app shell itself, not runtime API calls. wasm is the
        // ZXing barcode decoder - precaching it means the scanner works
        // offline/instantly after the first visit instead of refetching it.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
      },
    }),
  ],
})
