import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Share, PlusSquare, CheckCircle2, Laptop } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isStandalone, isInstalled, canInstall, isWindows, isDesktop, triggerInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // If user dismissed recently (within 3 days)
    try {
      const dismissedTime = localStorage.getItem('edumo_pwa_dismissed_at');
      if (dismissedTime) {
        const daysSinceDismissed = (Date.now() - Number(dismissedTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 3) {
          setIsDismissed(true);
        }
      }
    } catch {}

    // Manual trigger listener from settings or menu
    const handleManualTrigger = () => {
      setIsDismissed(false);
      handleInstallClick();
    };

    window.addEventListener('edumo-trigger-pwa-install', handleManualTrigger);
    return () => {
      window.removeEventListener('edumo-trigger-pwa-install', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      setInstalledSuccessfully(true);
      setTimeout(() => setInstalledSuccessfully(false), 4500);
    } else if (outcome === 'ios') {
      setShowIOSGuide(true);
    } else if (outcome === 'desktop-guide' || outcome === 'unavailable') {
      setShowDesktopGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowIOSGuide(false);
    setShowDesktopGuide(false);
    try {
      localStorage.setItem('edumo_pwa_dismissed_at', String(Date.now()));
    } catch {}
  };

  // IF THE APP IS ALREADY IN THE PHONE OR IN STANDALONE MODE: NEVER SHOW THE BANNER!
  if (isStandalone || isInstalled || !canInstall) {
    if (!installedSuccessfully && !showIOSGuide && !showDesktopGuide) {
      return null;
    }
  }

  if (isDismissed && !showIOSGuide && !showDesktopGuide && !installedSuccessfully) {
    return null;
  }

  // If installed successfully, show momentary celebration badge
  if (installedSuccessfully) {
    return (
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 p-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-slide-in-right">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
        <div className="flex-1 text-xs">
          <p className="font-bold">Edumo App Installed!</p>
          <p className="text-2xs opacity-90">Open from your desktop or home screen for full-screen offline access.</p>
        </div>
      </div>
    );
  }

  // Windows & Desktop 1-Click Guide Modal
  if (showDesktopGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1d5f99] to-[#683669] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {isWindows ? 'Install Edumo on Windows' : 'Install Edumo Desktop App'}
                </h4>
                <p className="text-2xs text-slate-500">Run as standalone PC application</p>
              </div>
            </div>
            <button
              onClick={() => setShowDesktopGuide(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-bold text-blue-950">Look in your Browser Address Bar</p>
                <p className="text-2xs text-blue-800 mt-0.5">
                  In <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>, look for the{' '}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">
                    App available. Install Edumo
                  </span>{' '}
                  icon on the right side of the address bar.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-bold text-purple-950">Or use Browser Settings Menu (...)</p>
                <p className="text-2xs text-purple-800 mt-0.5">
                  Click the <strong>(...) menu</strong> in the top-right corner of your browser &rarr; click{' '}
                  <strong>Apps</strong> &rarr; click <strong>"Install Edumo"</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-bold text-emerald-950">Pin to Windows Taskbar</p>
                <p className="text-2xs text-emerald-800 mt-0.5">
                  Once installed, Edumo will launch in its own window without browser tabs, and can be pinned to your Windows Start Menu and Taskbar!
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full justify-center text-xs font-bold py-2.5"
            onClick={() => {
              setShowDesktopGuide(false);
              try {
                localStorage.setItem('edumo_pwa_installed', 'true');
              } catch {}
              window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
            }}
          >
            I Understand / Launch as App
          </Button>
        </div>
      </div>
    );
  }

  // iOS 1-Tap Home Screen Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1d5f99] flex items-center justify-center text-white font-bold text-xs">
                E
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Install Edumo on iPhone</h4>
                <p className="text-2xs text-slate-500">Run as full-screen standalone app</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-2xs">
                1
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> Share button
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Located in the bottom toolbar in Safari browser.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-2xs">
                2
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Scroll down &amp; tap <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-purple-600" /> "Add to Home Screen"
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Name it "Edumo" and tap "Add" in the top right corner.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-2xs">
                3
              </div>
              <div>
                <p className="font-semibold text-emerald-900">
                  Enjoy Instant Mobile Experience
                </p>
                <p className="text-2xs text-emerald-700 mt-0.5">
                  Launches without browser address bar, with offline database sync.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => {
              setShowIOSGuide(false);
              try {
                localStorage.setItem('edumo_pwa_installed', 'true');
              } catch {}
              window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
            }}
          >
            I've Added It to My Home Screen
          </Button>
        </div>
      </div>
    );
  }

  // Floating PWA Install Pill Banner on Mobile & Responsive View
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 p-3 rounded-2xl bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white shadow-2xl border border-white/20 backdrop-blur-md animate-fade-in flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 truncate">
        <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
          {isWindows || isDesktop ? (
            <Monitor className="w-5 h-5" />
          ) : (
            <Smartphone className="w-5 h-5" />
          )}
        </div>
        <div className="truncate text-left">
          <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
            <span>{isWindows ? 'Install for Windows' : isDesktop ? 'Install Desktop App' : 'Install Edumo App'}</span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-white/20 font-extrabold tracking-wider">
              {isWindows ? 'WINDOWS' : 'PWA'}
            </span>
          </p>
          <p className="text-2xs text-white/80 truncate mt-0.5">
            {isWindows || isDesktop
              ? 'Fast standalone desktop application with offline database sync'
              : 'Full-screen mobile app with fast offline sync'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-white text-[#1d5f99] hover:bg-slate-100 font-extrabold text-2xs transition-all shadow-md active:scale-95 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
