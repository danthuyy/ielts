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
        // index.html is deliberately NOT precached. Precaching it makes
        // `precacheAndRoute`'s directoryIndex serve the cached copy for a
        // navigation to `/ielts/`, cache-first — which shadows the NetworkFirst
        // route below and is the exact behaviour that pinned the app to an old
        // snapshot. The entry point must come from the network; the hashed
        // bundles it points at are what get precached.
        globPatterns: ['**/*.{js,css,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Takes control on the very first visit instead of waiting for the next
        // page load. Without it the first session runs uncontrolled, and an
        // update during that session activates immediately with nothing left
        // waiting — the state where "Tải lại" had nothing to act on. Safe under
        // `registerType: 'prompt'`: skipWaiting still only happens on the
        // message the button sends, so a later update never swaps the app out
        // from under a session in progress.
        clientsClaim: true,
        // THE ROOT-CAUSE FIX for "pushed a new build, phones still show the old
        // one for days".
        //
        // The default generated worker serves the *precached* index.html for
        // every navigation (createHandlerBoundToURL). index.html is the one
        // file with no content hash, so pinning it in the cache pins the whole
        // app to the snapshot the worker was installed with — and with hash
        // routing the SPA never navigates, so the worker rarely gets a reason
        // to check for a newer self. The entry point could stay frozen for
        // days while every hashed bundle it points at sits unused on the server.
        //
        // Disabling the fallback route and handling navigations network-first
        // means an online client always fetches the latest index.html — which
        // references the latest bundles — and only falls back to the copy
        // cached on its last online visit when actually offline. The bundles
        // themselves are content-hashed and stay cache-first, which is correct
        // and free.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Only real page loads, not hash changes (those never reach the SW).
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              // A slow-but-online connection should still wait a moment for the
              // fresh copy before giving up to the cached one.
              networkTimeoutSeconds: 4,
              // Bypass GitHub Pages' max-age=600 on index.html. Without this the
              // "network" fetch is answered by the browser's 10-minute HTTP
              // cache, so a fresh deploy still would not show for those ten
              // minutes. Offline is unaffected: the fetch simply fails and falls
              // back to the app-shell cache below.
              fetchOptions: { cache: 'no-store' },
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Progress lives in Supabase; a cached response would show stale
            // data after studying on another device.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\//,
            handler: 'NetworkOnly',
          },
          {
            // Pronunciation clips. Deliberately runtime-cached rather than
            // precached: there is one per word, so precaching them would make
            // the first visit download the whole library before the app opened.
            // Cache-first is safe because a clip's contents never change.
            urlPattern: ({ url }) => url.pathname.includes('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'word-audio',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
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
