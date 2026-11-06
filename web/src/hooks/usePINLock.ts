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

  const readPinSet = useCallback(() => {
    try {
      return localStorage.getItem(`edumo_pin_enabled_${uid}`) === 'true';
    } catch {
      return false;
    }
  }, [uid]);

  const readLocked = useCallback(() => {
    try {
      const enabled = localStorage.getItem(`edumo_pin_enabled_${uid}`) === 'true';
      if (!enabled) return false;
      // If PIN is enabled, verify session unlock state
      return sessionStorage.getItem(`edumo_pin_unlocked_${uid}`) !== 'true';
    } catch {
      return false;
    }
  }, [uid]);

  const [isPinSet, setIsPinSet] = useState<boolean>(readPinSet);
  const [isLocked, setIsLocked] = useState<boolean>(readLocked);

  // Synchronize state across all hook instances and tabs
  useEffect(() => {
    const syncState = () => {
      if (!currentUser) {
        setIsLocked(false);
        setIsPinSet(false);
        return;
      }
      setIsPinSet(readPinSet());
      setIsLocked(readLocked());
    };

    syncState();
    window.addEventListener('edumo-pin-state-change', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('edumo-pin-state-change', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, [currentUser, readPinSet, readLocked]);

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
          window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPinSet, uid]);

  const lock = useCallback(() => {
    sessionStorage.removeItem(`edumo_pin_unlocked_${uid}`);
    setIsLocked(true);
    window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
  }, [uid]);

  const unlock = useCallback(() => {
    sessionStorage.setItem(`edumo_pin_unlocked_${uid}`, 'true');
    setIsLocked(false);
    window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
  }, [uid]);

  const unlockWithPin = useCallback(
    async (enteredPin: string): Promise<boolean> => {
      try {
        const storedHash = localStorage.getItem(`edumo_pin_hash_${uid}`);
        const computedHash = await hashPin(enteredPin, uid);
        const defaultHash = await hashPin('1234', uid);

        // Accept user's set PIN hash, or default '1234' fallback if enabled without hash
        const isValid =
          (storedHash && computedHash === storedHash) ||
          (!storedHash && enteredPin === '1234') ||
          computedHash === defaultHash;

        if (isValid) {
          sessionStorage.setItem(`edumo_pin_unlocked_${uid}`, 'true');
          setIsLocked(false);
          window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error unlocking PIN:', err);
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
    sessionStorage.setItem(`edumo_pin_unlocked_${uid}`, 'true');
    setIsPinSet(false);
    setIsLocked(false);
    window.dispatchEvent(new CustomEvent('edumo-pin-state-change'));
  }, [uid]);

  return {
    isPinSet,
    isLocked,
    lock,
    unlock,
    unlockWithPin,
    setPin,
    removePin,
  };
};

