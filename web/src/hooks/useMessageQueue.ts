/**
 * useMessageQueue: Hook for managing offline message queue using localStorage.
 * Allows optimistic UI updates and automatic retry when online.
 */

import { useCallback, useEffect, useState } from 'react'

export interface QueuedMessage {
  tempId: string
  body: string
  attachmentUrl: string | null
  timestamp: number
  status: 'queued' | 'sending' | 'failed'
  error?: string
}

const QUEUE_STORAGE_KEY = (conversationId: string) => `msg_queue_${conversationId}`

export function useMessageQueue(conversationId: string | null) {
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine)

  // Initialize queue from localStorage on mount
  useEffect(() => {
    if (!conversationId) return

    const stored = localStorage.getItem(QUEUE_STORAGE_KEY(conversationId))
    if (stored) {
      try {
        setQueue(JSON.parse(stored))
      } catch (e) {
        console.warn('[MessageQueue] Failed to parse stored queue:', e)
      }
    }
  }, [conversationId])

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    if (!conversationId) return

    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY(conversationId))
    } else {
      localStorage.setItem(QUEUE_STORAGE_KEY(conversationId), JSON.stringify(queue))
    }
  }, [queue, conversationId])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.debug('[MessageQueue] Device is online')
    }
    const handleOffline = () => {
      setIsOnline(false)
      console.debug('[MessageQueue] Device is offline')
    }

    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('offline', handleOffline)

    return () => {
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Enqueue a message (add to queue and localStorage).
   */
  const enqueueMessage = useCallback(
    (body: string, attachmentUrl: string | null = null): QueuedMessage => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      const queuedMsg: QueuedMessage = {
        tempId,
        body,
        attachmentUrl,
        timestamp: Date.now(),
        status: 'queued',
      }

      setQueue(prev => [...prev, queuedMsg])
      console.debug('[MessageQueue] Message enqueued:', tempId)
      return queuedMsg
    },
    [],
  )

  /**
   * Update message status in queue (e.g., sending, failed).
   */
  const updateMessageStatus = useCallback((tempId: string, status: 'queued' | 'sending' | 'failed', error?: string) => {
    setQueue(prev =>
      prev.map(msg =>
        msg.tempId === tempId
          ? { ...msg, status, error }
          : msg,
      ),
    )
    console.debug('[MessageQueue] Message status updated:', tempId, status)
  }, [])

  /**
   * Remove message from queue (after successful send).
   */
  const dequeueMessage = useCallback((tempId: string) => {
    setQueue(prev => prev.filter(msg => msg.tempId !== tempId))
    console.debug('[MessageQueue] Message dequeued:', tempId)
  }, [])

  /**
   * Clear all messages from queue.
   */
  const clearQueue = useCallback(() => {
    setQueue([])
    if (conversationId) {
      localStorage.removeItem(QUEUE_STORAGE_KEY(conversationId))
    }
    console.debug('[MessageQueue] Queue cleared')
  }, [conversationId])

  /**
   * Get all failed messages that can be retried.
   */
  const getFailedMessages = useCallback(() => {
    return queue.filter(msg => msg.status === 'failed')
  }, [queue])

  /**
   * Get all queued or sending messages.
   */
  const getPendingMessages = useCallback(() => {
    return queue.filter(msg => msg.status === 'queued' || msg.status === 'sending')
  }, [queue])

  return {
    queue,
    isOnline,
    enqueueMessage,
    updateMessageStatus,
    dequeueMessage,
    clearQueue,
    getFailedMessages,
    getPendingMessages,
  }
}
