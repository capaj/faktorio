import { AppRouter } from 'faktorio-api/src/trpcRouter'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import SuperJSON from 'superjson'
import { authHeaders } from './AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const VITE_API_URL = import.meta.env.VITE_API_URL

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function sameBytes(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a || a.byteLength !== b.length) return false
  const view = new Uint8Array(a)
  return view.every((byte, i) => byte === b[i])
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ])
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
          headers: authHeaders
        })
      ]
    })
  }

  isSupported() {
    return (
      Boolean(VAPID_PUBLIC_KEY) &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  async initialize(): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set')
      return false
    }
    if (!this.isSupported()) return false
    if (this.registration) return true

    try {
      // The service worker is registered by appBootstrap.js. `ready` never
      // resolves when registration failed, so do not wait forever.
      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10_000
      )
      if (!registration) {
        console.error('Service Worker did not become ready')
        return false
      }
      this.registration = registration
      return true
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

    return Notification.requestPermission()
  }

  private async saveSubscription(subscription: PushSubscription) {
    // toJSON() returns the keys base64url encoded, as the push protocol expects
    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Push subscription is missing keys')
    }
    await this.trpcClient.webPushNotifications.subscribe.mutate({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
    })
  }

  /** Returns the current browser subscription, discarding it if it was created with a different VAPID key */
  private async getValidSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null
    const subscription = await this.registration.pushManager.getSubscription()
    if (!subscription) return null

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    if (
      subscription.options.applicationServerKey &&
      !sameBytes(
        subscription.options.applicationServerKey,
        applicationServerKey
      )
    ) {
      // VAPID keys were rotated; the old subscription can no longer be used
      await this.trpcClient.webPushNotifications.unsubscribe
        .mutate({ endpoint: subscription.endpoint })
        .catch(() => {})
      await subscription.unsubscribe()
      return null
    }
    return subscription
  }

  async subscribe(): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key is not configured')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    if (!(await this.initialize()) || !this.registration) {
      throw new Error('Service Worker not registered')
    }

    const subscription =
      (await this.getValidSubscription()) ??
      (await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      }))

    await this.saveSubscription(subscription)
    return true
  }

  async unsubscribe(): Promise<boolean> {
    if (!(await this.initialize()) || !this.registration) return true

    const subscription = await this.registration.pushManager.getSubscription()
    if (!subscription) return true

    await this.trpcClient.webPushNotifications.unsubscribe.mutate({
      endpoint: subscription.endpoint
    })
    return subscription.unsubscribe()
  }

  /**
   * Whether this browser is subscribed. An existing subscription is re-sent to
   * the server so it is stored for the signed-in user even if the server
   * dropped it or another user subscribed on this browser before.
   */
  async isSubscribed(): Promise<boolean> {
    try {
      if (!(await this.initialize())) return false
      if (Notification.permission !== 'granted') return false

      const subscription = await this.getValidSubscription()
      if (!subscription) return false

      await this.saveSubscription(subscription)
      return true
    } catch (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
  }

  async sendTestNotification() {
    return this.trpcClient.webPushNotifications.sendTestNotification.mutate()
  }
}

export const pushNotificationService = new PushNotificationService()
