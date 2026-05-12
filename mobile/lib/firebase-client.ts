import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let isConfigured: boolean | undefined = undefined;

/**
 * Checks if basic Firebase configuration is present.
 */
export const isFirebaseAvailable = () => {
  if (isConfigured !== undefined) return isConfigured;
  
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  isConfigured = !!(apiKey?.trim() && projectId?.trim() && appId?.trim());
  return isConfigured;
};

/**
 * Initializes and returns the Firebase App instance.
 */
export const getFirebaseApp = () => {
  if (app || !isFirebaseAvailable()) return app;
  
  try {
    app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
    return app;
  } catch (error) {
    console.warn('[Firebase] Initialization error:', error);
    return null;
  }
};

/**
 * Initializes and returns the Firestore instance.
 */
export const getFirestoreInstance = () => {
  if (db) return db;
  
  const a = getFirebaseApp();
  if (!a) return null;

  const databaseId = process.env.EXPO_PUBLIC_FIRESTORE_DATABASE_ID || 'neighborship-messaging';
  db = getFirestore(a, databaseId);

  // Support for local Firestore emulator
  const emulatorHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const [h, p] = emulatorHost.split(':');
    connectFirestoreEmulator(db, h, +p);
  }
  
  return db;
};

/**
 * Authenticates the user with a custom token for Firestore access.
 */
export const signInWithFirebase = async (token: string) => {
  const a = getFirebaseApp();
  if (a) {
    try {
      await signInWithCustomToken(getAuth(a), token);
    } catch (error) {
      console.warn('[Firebase] Auth error:', error);
    }
  }
};

/**
 * Resets the Firebase client (useful for logout).
 */
export const resetFirebaseClient = () => {
  app = null;
  db = null;
  isConfigured = undefined;
};
