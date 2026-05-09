/**
 * useFirestoreMessages: Hook for real-time message listening from Firestore on Mobile.
 * Provides graceful fallback when Firebase is unavailable.
 */

import { getFirebaseApp, getFirestoreInstance, isFirebaseAvailable } from '../lib/firebase-client';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface FirebaseMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string;
  sender_picture_url: string | null;
  body: string;
  attachment_url: string | null;
  original_filename?: string | null;
  created_at: string;
  read_receipts: Record<string, string>;
}

export function useFirestoreMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirebaseAvail, setIsFirebaseAvail] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(50);

  // Use refs to keep track of current state for the timeout callback
  const isLoadingRef = useRef(isLoading);
  const messagesRef = useRef(messages);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
    messagesRef.current = messages;
  }, [isLoading, messages]);

  const loadMore = useCallback(() => {
    setCurrentLimit(prev => prev + 50);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsFirebaseAvail(false);
      return;
    }

    // Check if Firebase is available
    const app = getFirebaseApp();
    if (!app || !isFirebaseAvailable()) {
      setIsFirebaseAvail(false);
      return;
    }

    let unsubscribeFirestore: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Fallback trigger: if Firestore doesn't return anything in 5s, we flag it as unavailable
    timeoutId = setTimeout(() => {
      if (isLoadingRef.current && messagesRef.current.length === 0) {
        setIsLoading(false);
        setIsFirebaseAvail(false); 
      }
    }, 5000);

    const auth = getAuth(app);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) console.debug('[Firestore] Firebase Auth not signed in');
    });

    function startListener() {
      setIsFirebaseAvail(true);
      setIsLoading(true);
      setError(null);

      try {
        const firestore = getFirestoreInstance();
        if (!firestore) {
          setIsFirebaseAvail(false);
          setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        const q = query(
          collection(firestore, 'conversations', conversationId, 'messages'),
          orderBy('created_at', 'desc'),
          limit(currentLimit)
        );

        unsubscribeFirestore = onSnapshot(
          q,
          snapshot => {
            try {
              const newMessages: FirebaseMessage[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                newMessages.push({
                  id: data.id || doc.id,
                  sender_id: data.sender_id,
                  sender_username: data.sender_username,
                  sender_display_name: data.sender_display_name,
                  sender_picture_url: data.sender_picture_url,
                  body: data.body,
                  attachment_url: data.attachment_url,
                  original_filename: data.original_filename,
                  created_at: data.created_at,
                  read_receipts: data.read_receipts || {},
                });
              });
              setMessages(newMessages);
              setIsLoading(false);
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            } catch (err) {
              console.warn('[Firestore] Snapshot processing error:', err);
              setIsLoading(false);
            }
          },
          (err: Error) => {
            console.warn('[Firestore] Listener error:', err.message);
            setIsLoading(false);
            setIsFirebaseAvail(false); 
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          },
        );
      } catch (err) {
        console.warn('[Firestore] Failed to setup listener:', err);
        setIsLoading(false);
        setIsFirebaseAvail(false);
      }
    }

    startListener();

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [conversationId, currentLimit]);

  return {
    messages,
    isLoading,
    error,
    isFirebaseAvailable: isFirebaseAvail,
    loadMore,
    hasMore: messages.length >= currentLimit
  };
}
