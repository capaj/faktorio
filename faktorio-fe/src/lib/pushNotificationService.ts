import { trpcClient } from './trpcClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return false
    }

    if (!('PushManager' in window)) {
      console.log('Push messaging not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', this.registration)
      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
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
    return permission
  }

  async subscribe(): Promise<boolean> {
    try {
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

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      // Send subscription to server
      await trpcClient.push.subscribe.mutate({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh') || new ArrayBuffer(0)))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth') || new ArrayBuffer(0))))
        }
      })

      console.log('Push subscription successful:', subscription)
      return true
    } catch (error) {
      console.error('Push subscription failed:', error)
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
      await trpcClient.push.unsubscribe.mutate({
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
      if (!this.registration) {
        return false
      }

      const subscription = await this.registration.pushManager.getSubscription()
      return subscription !== null
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