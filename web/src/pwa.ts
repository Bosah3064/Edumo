import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('A new version of Edumo is available. Reload now to update?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.info('Edumo is ready to work completely offline.');
      },
    });
  }
}
