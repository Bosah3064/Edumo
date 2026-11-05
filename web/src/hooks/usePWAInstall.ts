import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export const usePWAInstall = () => {
  const detectStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    return detectStandalone();
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (detectStandalone()) {
      try {
        localStorage.setItem('edumo_pwa_installed', 'true');
      } catch {
        // Safe storage fallback
      }
      return true;
    }
    try {
      return localStorage.getItem('edumo_pwa_installed') === 'true';
    } catch {
      return false;
    }
  });

  const [hasPrompt, setHasPrompt] = useState<boolean>(Boolean(globalDeferredPrompt));
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Initial sync
    if (detectStandalone()) {
      setIsStandalone(true);
      setIsInstalled(true);
      try {
        localStorage.setItem('edumo_pwa_installed', 'true');
      } catch {}
    }

    // Chrome / Android getInstalledRelatedApps API
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (relatedApps && relatedApps.length > 0) {
            setIsInstalled(true);
            try {
              localStorage.setItem('edumo_pwa_installed', 'true');
            } catch {}
            window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
          }
        })
        .catch(() => {});
    }

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setHasPrompt(false);
      try {
        localStorage.setItem('edumo_pwa_installed', 'true');
      } catch {}
      window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
    };

    // Recheck state on custom event
    const handleStateChange = () => {
      try {
        if (localStorage.getItem('edumo_pwa_installed') === 'true' || detectStandalone()) {
          setIsInstalled(true);
        }
      } catch {}
    };

    // Listen to media query changes (e.g. if opened in standalone window)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
        try {
          localStorage.setItem('edumo_pwa_installed', 'true');
        } catch {}
        window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('edumo-pwa-state-change', handleStateChange);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('edumo-pwa-state-change', handleStateChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        try {
          localStorage.setItem('edumo_pwa_installed', 'true');
        } catch {}
        window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
      }
      globalDeferredPrompt = null;
      setHasPrompt(false);
      return choice.outcome;
    }

    if (isIOS) {
      return 'ios';
    }

    return 'unavailable';
  };

  // If already installed on phone or running in standalone mode, canInstall is FALSE
  const canInstall = !isInstalled && !isStandalone;

  return {
    isStandalone,
    isInstalled,
    canInstall,
    hasPrompt,
    isIOS,
    triggerInstall,
  };
};

