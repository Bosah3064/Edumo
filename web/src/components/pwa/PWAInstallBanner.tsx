import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Apple,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const {
    isStandalone,
    canInstall,
    hasPrompt,
    isIOS,
    isAndroid,
    isPhone,
    phoneOS,
    platformLabel,
    isInAppBrowser,
    triggerInstall,
  } = usePWAInstall();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(() => (isIOS ? 'ios' : 'android'));
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  // Synchronize active tab with detected phone platform
  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [isIOS, isAndroid]);

  // Session dismissal and trigger event listener
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('edumo_pwa_banner_dismissed') === 'true';
      if (dismissed) {
        setIsDismissed(true);
      }
    } catch {}

    const handleManualTrigger = () => {
      setIsDismissed(false);
      handleInstallClick();
    };

    window.addEventListener('edumo-trigger-pwa-install', handleManualTrigger);
    return () => {
      window.removeEventListener('edumo-trigger-pwa-install', handleManualTrigger);
    };
  }, [hasPrompt]);

  const handleInstallClick = async () => {
    if (isAndroid && hasPrompt) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setTimeout(() => setInstalledSuccessfully(false), 5000);
        return;
      }
    }
    // Show dedicated phone installation sheet
    setShowModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('edumo_pwa_banner_dismissed', 'true');
    } catch {}
  };

  // Strictly for mobile phones: if desktop, or running inside installed standalone PWA, never render
  if (!isPhone || isStandalone || !canInstall) {
    if (!installedSuccessfully && !showModal) {
      return null;
    }
  }

  return (
    <>
      {/* Installed Toast Notification */}
      {installedSuccessfully && (
        <div className="fixed top-4 left-3 right-3 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-slide-in-right border border-emerald-400">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm">Edumo App Installed!</p>
            <p className="text-emerald-100 mt-0.5">
              Launch directly from your phone home screen for full-screen offline access.
            </p>
          </div>
        </div>
      )}

      {/* Floating Bottom Pill Banner — Positioned above mobile bottom navigation (bottom-20) */}
      {!isDismissed && !showModal && !isStandalone && (
        <aside
          aria-label="Install Edumo application banner"
          className="fixed bottom-20 left-3 right-3 z-40 p-3 rounded-2xl bg-gradient-to-r from-[#1d5f99] via-[#234c7a] to-[#683669] text-white shadow-2xl border border-white/20 backdrop-blur-xl animate-fade-in flex items-center justify-between gap-2.5 max-w-md mx-auto"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
              {isIOS ? <Apple className="w-5 h-5 text-sky-200" /> : <Smartphone className="w-5 h-5 text-amber-200" />}
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black tracking-tight">Install Edumo</span>
                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded-full bg-white/25 font-bold tracking-wider text-amber-200">
                  {platformLabel}
                </span>
              </div>
              <p className="text-2xs text-white/85 truncate mt-0.5">
                {isIOS ? 'Add to iPhone Home Screen' : 'Install for Android with offline sync'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-white text-[#1d5f99] hover:bg-slate-100 font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1d5f99]" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Mobile-Only Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1d5f99] to-[#683669] flex items-center justify-center text-white font-bold text-base shadow-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 tracking-tight">
                    Install Edumo on Phone
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full offline marks entry, attendance &amp; instant alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-App Browser Detection Warning */}
            {isInAppBrowser && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">In-App Browser Detected</p>
                  <p className="text-2xs text-amber-800 mt-0.5 leading-relaxed">
                    You opened this inside WhatsApp, Instagram, or Facebook. To install the app, tap the <strong>three dots (⋮)</strong> or <strong>Share</strong> button and choose <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Phone OS Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone (iOS)</span>
              </button>
            </div>

            {/* TAB CONTENT: ANDROID */}
            {activeTab === 'android' && (
              <div className="space-y-3 text-xs">
                {hasPrompt ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-emerald-950">Direct 1-Tap Ready</p>
                      <p className="text-2xs text-emerald-800">
                        Tap button to install Edumo on your Android device.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        const res = await triggerInstall();
                        if (res === 'accepted') {
                          setShowModal(false);
                          setInstalledSuccessfully(true);
                          setTimeout(() => setInstalledSuccessfully(false), 5000);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 shrink-0 font-bold"
                    >
                      Install Now
                    </Button>
                  </div>
                ) : null}

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Open Chrome or Browser Menu</p>
                    <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                      Tap the <strong>three vertical dots (⋮)</strong> in the top-right corner of Google Chrome or Samsung Internet.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Select "Install app" or "Add to Home screen"</p>
                    <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                      Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>) from the browser dropdown options.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">Confirm "Install"</p>
                    <p className="text-2xs text-emerald-800 mt-0.5 leading-relaxed">
                      Edumo will appear on your phone home screen with full offline roll-call, CBC marks entry and fees ledger!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: IPHONE (IOS) */}
            {activeTab === 'ios' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-2xs leading-relaxed">
                  <strong>Important:</strong> On iPhone, Apple requires using <strong>Safari</strong> browser to install apps to the home screen.
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      Tap the Share button <Share className="w-3.5 h-3.5 text-sky-600 inline ml-1" />
                    </p>
                    <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                      In Safari, tap the square icon with an upward arrow located in the bottom toolbar.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      Tap <PlusSquare className="w-3.5 h-3.5 text-sky-600 inline ml-1" /> "Add to Home Screen"
                    </p>
                    <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                      Scroll down in the Safari share sheet and choose <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-sky-950">Tap "Add" in Top Right</p>
                    <p className="text-2xs text-sky-800 mt-0.5 leading-relaxed">
                      The Edumo icon is added to your iPhone home screen and opens full-screen without Safari browser bars!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
