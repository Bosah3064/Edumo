import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture beforeinstallprompt immediately at script execution time to avoid hydration race conditions
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('edumo-deferred-prompt-ready'));
  });
}

export const usePWAInstall = () => {
  const detectStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone());
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => Boolean(globalDeferredPrompt));
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    const isWin = /windows|win32|win64/i.test(ua);
    const isMobileDevice = /iphone|ipad|ipod|android|mobile/i.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsWindows(isWin);
    setIsDesktop(!isMobileDevice);

    // Initial sync
    setIsStandalone(detectStandalone());

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };

    const handlePromptReady = () => {
      setHasPrompt(true);
    };

    // App installed event
    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setHasPrompt(false);
      setIsStandalone(true);
      window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
    };

    // Listen to media query changes (e.g. if opened in standalone window)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('edumo-deferred-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('edumo-deferred-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, [detectStandalone]);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'guide'> => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          globalDeferredPrompt = null;
          setHasPrompt(false);
          setIsStandalone(true);
        }
        return choice.outcome;
      } catch (err) {
        console.warn('PWA prompt invocation error:', err);
      }
    }

    // Fallback: show interactive platform instructions modal
    return 'guide';
  };

  // If the user is currently running in standalone display mode (the PWA is already open),
  // they don't need install prompts. If in standard browser, they can always install!
  const canInstall = !isStandalone;
  const isInstalled = isStandalone;

  const platformLabel = isIOS
    ? 'iPhone / iPad'
    : isAndroid
    ? 'Android'
    : isWindows
    ? 'Windows PC'
    : 'Desktop';

  return {
    isStandalone,
    isInstalled,
    canInstall,
    hasPrompt,
    isIOS,
    isAndroid,
    isWindows,
    isDesktop,
    platformLabel,
    triggerInstall,
  };
};
