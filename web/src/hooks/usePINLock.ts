import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Simple fast SHA-256 hash helper for client-side PIN storage
async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const usePINLock = () => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || 'guest';

  const [isPinSet, setIsPinSet] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`edumo_pin_enabled_${uid}`) === 'true';
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const enabled = localStorage.getItem(`edumo_pin_enabled_${uid}`) === 'true';
      if (!enabled) return false;
      // If PIN is enabled, lock on initial app launch
      return sessionStorage.getItem(`edumo_pin_unlocked_${uid}`) !== 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!currentUser) {
      setIsLocked(false);
      setIsPinSet(false);
      return;
    }

    try {
      const enabled = localStorage.getItem(`edumo_pin_enabled_${uid}`) === 'true';
      setIsPinSet(enabled);
      if (enabled) {
        const unlocked = sessionStorage.getItem(`edumo_pin_unlocked_${uid}`) === 'true';
        setIsLocked(!unlocked);
      } else {
        setIsLocked(false);
      }
    } catch {
      setIsLocked(false);
    }
  }, [uid, currentUser]);

  // Lock when app is put to background for > 5 minutes
  useEffect(() => {
    if (!isPinSet) return;

    let backgroundTime = 0;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundTime = Date.now();
      } else {
        if (backgroundTime && Date.now() - backgroundTime > 5 * 60 * 1000) {
          // Locked after 5 minutes of background
          sessionStorage.removeItem(`edumo_pin_unlocked_${uid}`);
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPinSet, uid]);

  const lock = useCallback(() => {
    sessionStorage.removeItem(`edumo_pin_unlocked_${uid}`);
    setIsLocked(true);
  }, [uid]);

  const unlockWithPin = useCallback(
    async (enteredPin: string): Promise<boolean> => {
      try {
        const storedHash = localStorage.getItem(`edumo_pin_hash_${uid}`);
        if (!storedHash) return false;

        const computedHash = await hashPin(enteredPin, uid);
        if (computedHash === storedHash) {
          sessionStorage.setItem(`edumo_pin_unlocked_${uid}`, 'true');
          setIsLocked(false);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [uid]
  );

  const setPin = useCallback(
    async (newPin: string): Promise<void> => {
      if (newPin.length !== 4) throw new Error('PIN must be exactly 4 digits');
      const hashed = await hashPin(newPin, uid);
      localStorage.setItem(`edumo_pin_enabled_${uid}`, 'true');
      localStorage.setItem(`edumo_pin_hash_${uid}`, hashed);
      sessionStorage.setItem(`edumo_pin_unlocked_${uid}`, 'true');
      setIsPinSet(true);
      setIsLocked(false);
      window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
    },
    [uid]
  );

  const removePin = useCallback(() => {
    localStorage.removeItem(`edumo_pin_enabled_${uid}`);
    localStorage.removeItem(`edumo_pin_hash_${uid}`);
    sessionStorage.removeItem(`edumo_pin_unlocked_${uid}`);
    setIsPinSet(false);
    setIsLocked(false);
    window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
  }, [uid]);

  return {
    isPinSet,
    isLocked,
    lock,
    unlockWithPin,
    setPin,
    removePin,
  };
};

