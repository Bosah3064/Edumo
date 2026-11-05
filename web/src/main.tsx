import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker immediately for fast offline caching & 1-tap installability
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Edumo PWA: update available');
  },
  onOfflineReady() {
    console.log('Edumo PWA: ready for offline use');
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
