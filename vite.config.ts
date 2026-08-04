/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The site is published at https://danthuyy.github.io/ielts/, so production
// assets must be requested from /ielts/. Dev serves from the root.
const GITHUB_PAGES_BASE = '/ielts/';

/**
 * The commit this build came from, shown in Settings.
 *
 * Without it there is no way to answer "is the thing I just pushed actually
 * what I am looking at" other than hunting for a visible change, which is
 * exactly the question a service worker makes hard.
 */
function buildId(): string {
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GITHUB_PAGES_BASE : '/',
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Prompted, not automatic: an auto-reload that lands mid-question throws
      // away the session. The banner in UpdateBanner.tsx lets the learner
      // finish first.
      registerType: 'prompt',
      // Registered from the app instead, so it can also keep checking for a new
      // version. The injected snippet registers once on load and never looks
      // again — and with hash routing the browser never navigates, so a tab
      // left open could serve the old build for days.
      injectRegister: null,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'IELTS Vocab Trainer',
        short_name: 'IELTS Vocab',
        description: 'Ứng dụng học từ vựng IELTS, hoạt động cả khi offline',
        lang: 'vi',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a1a',
        theme_color: '#0a0a1a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // A separate file, not the same one listed twice. A maskable icon is
          // cropped to whatever shape the platform wants — a circle on most
          // Android launchers — and only the middle 80% is guaranteed to
          // survive. The "any" icon fills its canvas, so used as a mask it lost
          // the word along the bottom.
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Progress lives in Supabase; a cached response would show stale data
        // after studying on another device.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Vendor code changes far less often than the app itself, so splitting
        // it keeps it cached across the frequent content-only commits.
        advancedChunks: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router)/ },
            { name: 'vendor-data', test: /node_modules[\\/](dexie|zod)/ },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
}));
