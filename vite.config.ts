import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Group only the vendor libraries that are fully needed for first paint
        // (react, supabase, query) so they cache independently and download in
        // parallel. MUI/emotion, recharts and zod are deliberately left to
        // Vite's default per-component splitting: forcing all of MUI into one
        // chunk pulls route-only components (TextField, Dialog, etc.) onto the
        // critical path, whereas default splitting keeps them in the lazy route
        // chunks that use them. This trims ~40KB gzip off the initial payload.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@tanstack')) return 'query'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          )
            return 'react'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest (custom src/sw.ts) instead of generateSW: push
      // notifications need `push`/`notificationclick` listeners in the service
      // worker, which the generated worker cannot include.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'TwoPot',
        short_name: 'TwoPot',
        description: 'Household expense tracker for two',
        theme_color: '#6750A4',
        background_color: '#FFFBFE',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Add expense',
            url: '/?action=add',
            icons: [{ src: 'icons/shortcut-add.png', sizes: '96x96' }],
          },
        ],
      },
      // Runtime caching for the Supabase API lives in src/sw.ts now.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules/**', 'e2e/**'],
  },
})
