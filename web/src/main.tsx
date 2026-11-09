import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Versioned PWA cache migration & auto-refresh
const APP_VERSION = '2.5.0';

if (typeof window !== 'undefined') {
  try {
    const cachedVersion = localStorage.getItem('edumo_app_version');
    if (cachedVersion && cachedVersion !== APP_VERSION) {
      console.log(`[PWA] Upgrading app version from ${cachedVersion} to ${APP_VERSION}`);
      localStorage.setItem('edumo_app_version', APP_VERSION);
      if ('caches' in window) {
        caches.keys().then(async (keys) => {
          await Promise.all(keys.map((key) => caches.delete(key)));
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) {
              await r.unregister();
            }
          }
          (window as any).location.reload();
        }).catch(() => {
          (window as any).location.reload();
        });
      } else {
        (window as any).location.reload();
      }
    } else {
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

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload once on controllerchange to avoid infinite loop
    if (!window.sessionStorage.getItem('edumo_sw_reloaded')) {
      window.sessionStorage.setItem('edumo_sw_reloaded', 'true');
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
