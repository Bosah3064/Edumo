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
  const [isPhone, setIsPhone] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const evaluatePlatform = () => {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSPhone = /iphone|ipod/.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/.test(ua) && window.innerWidth < 1024);
      const isAndroidPhone = /android/.test(ua);
      // Strictly mobile phones (screen width < 1024 and mobile device UA)
      const isPhoneDevice = (isIOSPhone || isAndroidPhone || (/mobile/.test(ua) && window.innerWidth < 768)) && window.innerWidth < 1024;
      const inApp = /fbav|instagram|fban|line|micromessenger|snapchat|whatsapp|wv/i.test(ua);

      setIsIOS(isIOSPhone);
      setIsAndroid(isAndroidPhone);
      setIsPhone(isPhoneDevice);
      setIsInAppBrowser(inApp);
    };

    evaluatePlatform();
    setIsStandalone(detectStandalone());

    const handleResize = () => evaluatePlatform();
    window.addEventListener('resize', handleResize);

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
      window.removeEventListener('resize', handleResize);
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

    // Fallback: show interactive mobile instructions modal
    return 'guide';
  };

  // Strictly for mobile phones: canInstall is true ONLY if user is visiting via browser on a mobile phone
  const canInstall = isPhone && !isStandalone;
  const isInstalled = isStandalone;

  const phoneOS: 'android' | 'ios' | null = isAndroid ? 'android' : isIOS ? 'ios' : null;
  const platformLabel: string = isIOS ? 'iPhone' : isAndroid ? 'Android' : 'Mobile';

  return {
    isStandalone,
    isInstalled,
    canInstall,
    hasPrompt,
    isIOS,
    isAndroid,
    isPhone,
    phoneOS,
    platformLabel,
    isInAppBrowser,
    // Desktop compatibility flags (strictly false since PWA is mobile-only)
    isWindows: false,
    isDesktop: false,
    triggerInstall,
  };
};
