import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBb_-yB9CFVg4w3b7_qoLmvzh_BY1Wj6j0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edumo-3dfc9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edumo-3dfc9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edumo-3dfc9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '382796082326',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:382796082326:web:512233f609ba97b89766b7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-Q6E12K8ECC',
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Analytics (only in browser, only when supported)
export const analyticsPromise = isSupported().then((yes) =>
  yes ? getAnalytics(app) : null,
);

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

// Connect to Local Emulators ONLY when explicitly requested (e.g. VITE_USE_EMULATORS='true')
const useEmulators =
  typeof window !== 'undefined' &&
  import.meta.env.VITE_USE_EMULATORS === 'true';

if (useEmulators && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
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

