import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-edumo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edumo-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edumo-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edumo-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Enable offline persistence for Firestore
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported by this browser');
    }
  });
}

// Connect to Local Emulators in Development
const isLocal =
  import.meta.env.DEV ||
  import.meta.env.VITE_USE_EMULATORS === 'true' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

if (isLocal && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  try {
    const authHost = 'http://127.0.0.1:9099';
    connectAuthEmulator(auth, authHost, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    window.__FIREBASE_EMULATORS_CONNECTED__ = true;
    console.info('🔌 Connected to Firebase local emulators');
  } catch (err) {
    console.warn('Firebase emulator connection note:', err);
  }
}

declare global {
  interface Window {
    __FIREBASE_EMULATORS_CONNECTED__?: boolean;
  }
}
