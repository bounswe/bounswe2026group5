import { useEffect } from 'react'
import { requestForToken, onMessageListener } from '#/lib/firebase'
import { useRegisterFCMToken } from '#/lib/queries/NotificationQueries'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_INVALIDATION_MAP, type NotificationType } from '#/lib/queries/NotificationQueries'

export const usePushNotifications = (isAuthenticated: boolean, currentUsername?: string) => {
    const { mutate: registerToken } = useRegisterFCMToken()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!isAuthenticated) return

        const setupNotifications = async () => {
            const token = await requestForToken()
            if (token) {
                const lastToken = localStorage.getItem('last_fcm_token')
                if (token !== lastToken) {
                    registerToken(
                        { token, device_type: 'web' },
                        {
                            onSuccess: () => localStorage.setItem('last_fcm_token', token),
                            onError: (err: any) => console.log('FCM registration skipped or failed:', err.message)
                        }
                    )
                }
            }
        }

        setupNotifications()

        const unsubscribe = onMessageListener((payload: any) => {
            const title = payload.notification?.title || 'New Notification'
            const body = payload.notification?.body || ''
            const type = payload.data?.type as NotificationType
            const actorUsername = payload.data?.actor_username
            
            // Filter self-notifications
            if (actorUsername && currentUsername && actorUsername === currentUsername) return

            toast.info(title, { description: body })

            if (type && NOTIFICATION_INVALIDATION_MAP[type]) {
                NOTIFICATION_INVALIDATION_MAP[type].forEach((queryKey) => {
                    queryClient.invalidateQueries({ queryKey })
                })
            }
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        })

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }, [isAuthenticated, registerToken, queryClient, currentUsername])
}
