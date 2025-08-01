import { AppRouter } from 'faktorio-api/src/trpcRouter'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import SuperJSON from 'superjson'
import { authHeaders } from './AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const VITE_API_URL = import.meta.env.VITE_API_URL

console.log(
  'VAPID_PUBLIC_KEY loaded:',
  VAPID_PUBLIC_KEY ? 'Yes (length: ' + VAPID_PUBLIC_KEY.length + ')' : 'No'
)
console.log(
  'VAPID_PUBLIC_KEY preview:',
  VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY.substring(0, 20) + '...' : 'Not set'
)

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export class PushNotificationService {
  private registration: ServiceWorkerRegistration | undefined
  trpcClient: ReturnType<typeof createTRPCClient<AppRouter>>

  constructor() {
    this.trpcClient = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          transformer: SuperJSON,
          url: VITE_API_URL,

          // You can pass any HTTP headers you wish here
          headers: authHeaders
        })
      ]
    })
  }
  async initialize(): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID_PUBLIC_KEY is not set')
      return false
    }

    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return false
    }

    if (!('PushManager' in window)) {
      console.log('Push messaging not supported')
      return false
    }

    try {
      // Wait for service worker to be ready (VitePWA handles registration)
      await navigator.serviceWorker.ready
      console.log('Service Worker ready')

      // Get the registration from VitePWA
      this.registration = await navigator.serviceWorker.getRegistration()
      if (this.registration) {
        console.log('Found service worker registration:', this.registration)
        return true
      }

      console.error('No service worker registration found')
      return false
    } catch (error) {
      console.error('Service Worker initialization failed:', error)
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied')
    }

    const permission = await Notification.requestPermission()
    console.log('Notification permission result:', permission)
    return permission
  }

  async subscribe(): Promise<boolean> {
    try {
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key is not configured')
      }

      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted')
      }

      if (!this.registration) {
        await this.initialize()
      }

      if (!this.registration) {
        throw new Error('Service Worker not registered')
      }

      // Check if there's an existing subscription
      const existingSubscription =
        await this.registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('Found existing subscription, unsubscribing first...')
        await existingSubscription.unsubscribe()
      }

      console.log('Converting VAPID key to Uint8Array...')
      const applicationServerKey = urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY
      ) as BufferSource
      console.log(
        'VAPID key converted, length:',
        String(applicationServerKey).length
      )

      console.log('Subscribing to push manager...')
      console.log(
        'Push manager supported:',
        'subscribe' in this.registration.pushManager
      )

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('Push subscription successful, sending to server...')

      // Send subscription to server
      await this.trpcClient.webPushNotifications.subscribe.mutate({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(
            String.fromCharCode(
              ...new Uint8Array(
                subscription.getKey('p256dh') || new ArrayBuffer(0)
              )
            )
          ),
          auth: btoa(
            String.fromCharCode(
              ...new Uint8Array(
                subscription.getKey('auth') || new ArrayBuffer(0)
              )
            )
          )
        }
      })

      console.log('Push subscription sent to server successfully')
      return true
    } catch (error) {
      console.error('Push subscription failed:', error)

      // Log additional details for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }

      throw error
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        return true // Already unsubscribed
      }

      const subscription = await this.registration.pushManager.getSubscription()
      if (!subscription) {
        return true // No subscription to unsubscribe from
      }

      // Unsubscribe from server first
      await this.trpcClient.webPushNotifications.unsubscribe.mutate({
        endpoint: subscription.endpoint
      })

      // Then unsubscribe locally
      const result = await subscription.unsubscribe()
      console.log('Push unsubscription successful:', result)
      return result
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      throw error
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      // Ensure service worker is initialized first
      if (!this.registration) {
        const initialized = await this.initialize()
        if (!initialized || !this.registration) {
          return false
        }
      }

      const subscription = await this.registration.pushManager.getSubscription()
      const hasSubscription = subscription !== null

      if (hasSubscription) {
        console.log('Found active push subscription:', subscription.endpoint)
      } else {
        console.log('No active push subscription found')
      }

      return hasSubscription
    } catch (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        return null
      }

      return await this.registration.pushManager.getSubscription()
    } catch (error) {
      console.error('Error getting subscription:', error)
      return null
    }
  }
}

export const pushNotificationService = new PushNotificationService()
