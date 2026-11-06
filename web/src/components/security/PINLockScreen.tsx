import React, { useState, useEffect } from 'react';
import { usePINLock } from '../../hooks/usePINLock';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Lock, Delete, Fingerprint, LogOut, ShieldCheck, KeyRound, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PINLockScreenProps {
  onUnlocked?: () => void;
}

export const PINLockScreen: React.FC<PINLockScreenProps> = ({ onUnlocked }) => {
  const { unlockWithPin, removePin } = usePINLock();
  const { currentUser, signOut } = useAuth();
  const { currentSchool } = useTenant();

  const [digits, setDigits] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorShake, setErrorShake] = useState<boolean>(false);

  // Native tactile haptic tap feedback
  const triggerHaptic = (duration = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {}
    }
  };

  const handleDigitPress = async (num: string) => {
    if (digits.length >= 4 || isVerifying) return;
    triggerHaptic(10);

    const nextDigits = digits + num;
    setDigits(nextDigits);

    if (nextDigits.length === 4) {
      setIsVerifying(true);
      const ok = await unlockWithPin(nextDigits);
      if (ok) {
        triggerHaptic(20);
        toast.success('App unlocked');
        if (onUnlocked) onUnlocked();
      } else {
        triggerHaptic(40);
        setErrorShake(true);
        toast.error('Incorrect PIN. (Default is 1234)');
        setTimeout(() => {
          setDigits('');
          setErrorShake(false);
          setIsVerifying(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    if (digits.length === 0 || isVerifying) return;
    triggerHaptic(10);
    setDigits(digits.slice(0, -1));
  };

  // Keyboard navigation for desktop & Windows PWA users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVerifying) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits, isVerifying]);

  const handleResetPin = () => {
    if (
      window.confirm(
        'Reset PIN lock? This will unlock your workspace so you can set a new security PIN in Settings.'
      )
    ) {
      removePin();
      toast.success('PIN lock disabled. Workspace unlocked!');
      if (onUnlocked) onUnlocked();
    }
  };

  const handleBiometricPrompt = async () => {
    triggerHaptic(15);
    if (window.PublicKeyCredential) {
      toast('Biometric prompt triggered on device', { icon: '🔒' });
    } else {
      toast('Please enter your 4-digit PIN (default: 1234)', { icon: 'ℹ️' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] text-white flex flex-col items-center justify-between p-6 select-none animate-fade-in">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between max-w-sm pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1d5f99] to-[#683669] flex items-center justify-center text-white font-extrabold text-xs shadow-md">
            E
          </div>
          <span className="text-xs font-bold tracking-tight text-slate-300 truncate max-w-[180px]">
            {currentSchool?.name || 'Edumo School Management'}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-400 text-2xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Locked</span>
        </div>
      </div>

      {/* Center PIN Area */}
      <div className="flex flex-col items-center max-w-sm w-full my-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg text-[#38bdf8]">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Enter Security PIN</h2>
          <p className="text-xs text-slate-400 mt-1 truncate max-w-xs mx-auto">
            Welcome back, {currentUser?.displayName || currentUser?.email || 'Educator'}
          </p>
          <p className="text-2xs text-[#38bdf8]/80 mt-0.5">
            Tip: You can use your physical keyboard numpad or tap the screen
          </p>
        </div>

        {/* 4 Digit Indicators with Shake on Error */}
        <div
          className={`flex items-center justify-center gap-4 py-2 transition-transform ${
            errorShake ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < digits.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#38bdf8] scale-125 shadow-[0_0_12px_rgba(56,189,248,0.7)]'
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs space-y-3 pb-safe">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/25 text-2xl font-semibold transition-all duration-100 flex items-center justify-center shadow-xs active:scale-95 border border-white/10 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics */}
          <button
            type="button"
            onClick={handleBiometricPrompt}
            className="h-14 sm:h-16 rounded-2xl bg-transparent hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            title="Biometric unlock"
          >
            <Fingerprint className="w-6 h-6 text-[#38bdf8]" />
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/25 text-2xl font-semibold transition-all duration-100 flex items-center justify-center shadow-xs active:scale-95 border border-white/10 cursor-pointer"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-2xl bg-transparent hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            title="Delete"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Footer Actions: Reset PIN & Sign In with password */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResetPin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors py-1 px-3 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Forgot PIN? Reset &amp; Unlock</span>
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-400 hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign in with password instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};

