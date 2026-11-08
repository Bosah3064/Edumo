import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/favicon.svg',
        'icons/apple-touch-icon.png',
        'icons/apple-touch-icon-v2.png',
        'icons/icon-192.png',
        'icons/icon-192-v2.png',
        'icons/icon-512.png',
        'icons/icon-512-v2.png',
        'icons/icon-maskable-512.png',
        'icons/icon-maskable-512-v2.png',
        'logo.png',
      ],
      manifest: {
        name: 'Edumo — School Management',
        short_name: 'Edumo',
        description: 'Smart school management for East African schools',
        theme_color: '#1d5f99',
        background_color: '#0B0F19',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'icons/icon-192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'edumo-classroom-hero.jpg',
            sizes: '1280x720',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Edumo School Management Workspace',
          },
          {
            src: 'edumo-campus-bg.jpg',
            sizes: '720x1280',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Edumo Mobile App',
          },
        ],
        shortcuts: [
          {
            name: 'Take Attendance',
            short_name: 'Attendance',
            description: '1-tap fast mark student attendance',
            url: './attendance',
            icons: [{ src: 'icons/icon-192-v2.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Learners Directory',
            short_name: 'Students',
            description: 'Browse student profiles and admissions',
            url: './students',
            icons: [{ src: 'icons/icon-192-v2.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Academic Marks',
            short_name: 'Academics',
            description: 'Record assessment marks and grades',
            url: './academics',
            icons: [{ src: 'icons/icon-192-v2.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        cacheId: 'edumo-v2-1',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@edumo/shared': resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
