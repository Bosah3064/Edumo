import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Versioned PWA cache migration & auto-refresh
const APP_VERSION = '2.1.0';

if (typeof window !== 'undefined') {
  try {
    const cachedVersion = localStorage.getItem('edumo_app_version');
    if (cachedVersion !== APP_VERSION) {
      console.log(`[PWA] Upgrading app version from ${cachedVersion || 'legacy'} to ${APP_VERSION}`);
      if ('caches' in window) {
        caches.keys().then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (!key.includes(APP_VERSION)) {
                console.log('[PWA] Deleting obsolete cache:', key);
                return caches.delete(key);
              }
            })
          );
        }).catch(() => {});
      }
      localStorage.setItem('edumo_app_version', APP_VERSION);
    }
  } catch {}
}

// Register PWA service worker immediately for fast offline caching & 1-tap installability
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Edumo PWA: update available, refreshing client immediately...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Edumo PWA: ready for offline use');
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Force immediate check for fresh service worker on server
      registration.update().catch(() => {});
    }
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
