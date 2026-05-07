/**
 * useFirestoreMessages: Hook for real-time message listening from Firestore.
 * Provides graceful fallback when Firebase is unavailable.
 */

import { getFirebaseApp, getFirestoreInstance, isFirebaseAvailable } from '#/lib/firebase-client'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'

export interface FirebaseMessage {
  id: string
  sender_id: string
  sender_username: string
  sender_display_name: string
  sender_picture_url: string | null
  body: string
  attachment_url: string | null
  created_at: string
  read_receipts: Record<string, string>
}

export function useFirestoreMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<FirebaseMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFirebaseAvail, setIsFirebaseAvail] = useState(false)

  // Use refs to keep track of current state for the timeout callback
  const isLoadingRef = useRef(isLoading)
  const messagesRef = useRef(messages)
  
  useEffect(() => {
    isLoadingRef.current = isLoading
    messagesRef.current = messages
  }, [isLoading, messages])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setIsFirebaseAvail(false)
      return
    }

    // Check if Firebase is available
    const app = getFirebaseApp()
    if (!app || !isFirebaseAvailable()) {
      console.debug('[Firestore] Firebase not available, skipping listener')
      setIsFirebaseAvail(false)
      return
    }

    let unsubscribeFirestore: (() => void) | null = null
    let timeoutId: NodeJS.Timeout | null = null

    // 1. Start safety timeout immediately to ensure UI never hangs
    timeoutId = setTimeout(() => {
      if (isLoadingRef.current && messagesRef.current.length === 0) {
        console.debug('[Firestore] Safety timeout reached for conversation', conversationId, '- falling back to HTTP')
        setIsLoading(false)
        setIsFirebaseAvail(false) // Trigger fallback to HTTP
      }
    }, 5000)

    // 2. Log Auth state for debugging, but DO NOT block the listener
    const auth = getAuth(app)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.debug('[Firestore] Firebase Auth user:', user.uid)
      } else {
        console.debug('[Firestore] Firebase Auth not signed in (Custom Token might be missing or configuration-not-found)')
      }
    })

    // 3. Start Firestore listener immediately (bypass auth check since we use 'allow read: if true')
    function startListener() {
      setIsFirebaseAvail(true)
      setIsLoading(true)
      setError(null)

      try {
        const firestore = getFirestoreInstance()
        if (!firestore) {
          setIsFirebaseAvail(false)
          setIsLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
          return
        }

        const q = query(
          collection(firestore, 'conversations', conversationId, 'messages'),
          orderBy('created_at', 'asc'),
        )

        unsubscribeFirestore = onSnapshot(
          q,
          snapshot => {
            try {
              const newMessages: FirebaseMessage[] = []
              snapshot.forEach(doc => {
                const data = doc.data()
                newMessages.push({
                  id: data.id || doc.id,
                  sender_id: data.sender_id,
                  sender_username: data.sender_username,
                  sender_display_name: data.sender_display_name,
                  sender_picture_url: data.sender_picture_url,
                  body: data.body,
                  attachment_url: data.attachment_url,
                  created_at: data.created_at,
                  read_receipts: data.read_receipts || {},
                })
              })
              setMessages(newMessages)
              setIsLoading(false)
              if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
              }
              console.debug('[Firestore] Snapshot received:', newMessages.length, 'messages')
            } catch (err) {
              console.warn('[Firestore] Snapshot processing error:', err)
              setIsLoading(false)
            }
          },
          (err: Error) => {
            console.warn('[Firestore] Listener error:', err.message)
            setIsLoading(false)
            setIsFirebaseAvail(false) // Trigger fallback to HTTP
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
          },
        )
      } catch (err) {
        console.warn('[Firestore] Failed to setup listener:', err)
        setIsLoading(false)
        setIsFirebaseAvail(false) // Trigger fallback to HTTP
      }
    }

    startListener()

    return () => {
      console.debug('[Firestore] Cleaning up for conversation', conversationId)
      unsubscribeAuth()
      if (unsubscribeFirestore) unsubscribeFirestore()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [conversationId])

  return {
    messages,
    isLoading,
    error,
    isFirebaseAvailable: isFirebaseAvail,
  }
}
