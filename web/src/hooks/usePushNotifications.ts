import { useEffect } from 'react'
import { isFirebaseAvailable, requestForToken, onMessageListener } from '#/lib/firebase-client'
import { useRegisterFCMToken } from '#/lib/queries/NotificationQueries'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_INVALIDATION_MAP, type NotificationType } from '#/lib/queries/NotificationQueries'

export const usePushNotifications = (isAuthenticated: boolean, currentUsername?: string) => {
    const { mutate: registerToken } = useRegisterFCMToken()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!isAuthenticated) return

        // Skip Firebase push setup when Firebase is not configured.
        // Notifications will still work via HTTP polling (refetchInterval on the query).
        if (!isFirebaseAvailable()) {
            console.debug('[Push] Firebase not configured — using polling fallback for notifications')
            return
        }

        // We store the registered token per user to support multi-account login on the same browser
        const userId = localStorage.getItem('id')
        const tokenKey = `last_fcm_token_${userId}`

        const setupNotifications = async () => {
            // Attempt to get the token. 
            // In Dashboard, this will be 'silent' (forcePrompt=false) to avoid intrusive popups on load.
            const token = await requestForToken(false)
            
            if (token) {
                const registeredToken = localStorage.getItem(tokenKey)
                if (token !== registeredToken) {
                    registerToken(
                        { token, device_type: 'web' },
                        {
                            onSuccess: () => {
                                localStorage.setItem(tokenKey, token)
                                console.log('FCM token registered for user:', userId)
                            },
                            onError: (err: any) => console.log('FCM registration failed:', err.message)
                        }
                    )
                }
            }
        }

        // Run immediately
        setupNotifications()

        // AGGRESSIVE POLLING:
        // When the user logs in, they are prompted for permission. 
        // We poll every 500ms to detect the exact moment they click 'Allow'.
        const interval = setInterval(() => {
            if (Notification.permission === 'granted') {
                setupNotifications()
                // If we successfully got a token for this user, we can stop polling
                if (localStorage.getItem(tokenKey)) {
                    clearInterval(interval)
                }
            }
        }, 500)

        // Stop polling after 15 seconds to avoid unnecessary background work
        const timeout = setTimeout(() => clearInterval(interval), 15000)

        const unsubscribe = onMessageListener((payload: any) => {
            const title = payload.notification?.title || 'New Notification'
            const body = payload.notification?.body || ''
            const type = payload.data?.type as NotificationType
            const actorUsername = payload.data?.actor_username
            
            if (actorUsername && currentUsername && actorUsername === currentUsername) return

            // Suppress toasts if the user is currently in the messaging interface
            const isMessagingInterface = window.location.pathname.startsWith('/messages')
            if (!isMessagingInterface) {
                toast.info(title, { description: body })
            }

            if (type && NOTIFICATION_INVALIDATION_MAP[type]) {
                NOTIFICATION_INVALIDATION_MAP[type].forEach((queryKey) => {
                    queryClient.invalidateQueries({ queryKey })
                })
            }
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        })

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
            if (unsubscribe) unsubscribe()
        }
    }, [isAuthenticated, currentUsername, registerToken, queryClient])
}
