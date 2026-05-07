import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let msg: Messaging | null = null
let isConfigured: boolean | undefined = undefined

export const isFirebaseAvailable = () => {
  if (isConfigured !== undefined) return isConfigured
  const env = import.meta.env
  isConfigured = !!(env.VITE_FIREBASE_API_KEY?.trim() && env.VITE_FIREBASE_PROJECT_ID?.trim() && env.VITE_FIREBASE_APP_ID?.trim())
  return isConfigured
}

export const getFirebaseApp = () => {
  if (app || !isFirebaseAvailable()) return app
  try {
    const env = import.meta.env
    app = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
    return app
  } catch { return null }
}

export const getFirestoreInstance = () => {
  if (db) return db
  const a = getFirebaseApp()
  if (!a) return null
  db = getFirestore(a, import.meta.env.VITE_FIRESTORE_DATABASE_ID || undefined)
  if (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) {
    const [h, p] = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST.split(':')
    connectFirestoreEmulator(db, h, +p)
  }
  return db
}

export const getMessagingInstance = () => {
  if (msg) return msg
  const a = getFirebaseApp()
  return a ? (msg = getMessaging(a)) : null
}

export const signInWithFirebase = async (t: string) => {
  const a = getFirebaseApp()
  if (a) await signInWithCustomToken(getAuth(a), t).catch(console.warn)
}

export const requestForToken = async () => {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission === 'denied') return null
  const m = getMessagingInstance()
  return m ? getToken(m, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY }).catch(() => null) : null
}

export const onMessageListener = (cb: (p: any) => void) => {
  const m = getMessagingInstance()
  return m ? onMessage(m, cb) : () => {}
}

export const resetFirebaseClient = () => { app = null; db = null; msg = null; isConfigured = undefined }

