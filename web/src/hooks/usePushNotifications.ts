import { useEffect } from 'react'
import { requestForToken, onMessageListener } from '#/lib/firebase'
import { useRegisterFCMToken } from '#/lib/queries/NotificationQueries'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_INVALIDATION_MAP, type NotificationType } from '#/lib/queries/NotificationQueries'

export const usePushNotifications = (isAuthenticated: boolean) => {
    const { mutate: registerToken } = useRegisterFCMToken()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!isAuthenticated) return

        const setupNotifications = async () => {
            const token = await requestForToken()
            if (token) {
                registerToken({ token, device_type: 'web' })
            }
        }

        setupNotifications()

        const unsubscribe = onMessageListener((payload: any) => {
            console.log('Foreground message received:', payload)
            
            const title = payload.notification?.title || 'New Notification'
            const body = payload.notification?.body || ''
            const type = payload.data?.type as NotificationType

            toast(title, {
                description: body,
            })

            // Invalidate relevant queries based on notification type
            if (type && NOTIFICATION_INVALIDATION_MAP[type]) {
                NOTIFICATION_INVALIDATION_MAP[type].forEach((queryKey) => {
                    queryClient.invalidateQueries({ queryKey })
                })
            }
            
            // Always invalidate notifications list
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        })

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }, [isAuthenticated, registerToken, queryClient])
}
