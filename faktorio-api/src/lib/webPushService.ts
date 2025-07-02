import webpush from 'web-push'
import { pushSubscriptionTb } from '../schema'
import { eq } from 'drizzle-orm'
import { LibSQLDatabase } from 'drizzle-orm/libsql'


interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

export class WebPushService {
  constructor(
    private db: LibSQLDatabase,
    private vapidKeys: {
      publicKey: string
      privateKey: string
      subject: string
    }
  ) {
    webpush.setVapidDetails(
      vapidKeys.subject,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    )
  }

  async sendNotificationToUser(userId: string, payload: NotificationPayload) {
    const subscriptions = await this.db
      .select()
      .from(pushSubscriptionTb)
      .where(eq(pushSubscriptionTb.user_id, userId))

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`)
      return
    }

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        this.sendNotificationToSubscription(subscription, payload)
      )
    )

    const failedSubscriptions = results
      .map((result, index) => ({ result, subscription: subscriptions[index] }))
      .filter(({ result }) => result.status === 'rejected')

    // Clean up failed subscriptions
    for (const { subscription } of failedSubscriptions) {
      console.log(`Removing failed subscription: ${subscription.endpoint}`)
      await this.db
        .delete(pushSubscriptionTb)
        .where(eq(pushSubscriptionTb.id, subscription.id))
    }

    const successCount = results.filter(
      (result) => result.status === 'fulfilled'
    ).length

    console.log(
      `Sent notification to ${successCount}/${subscriptions.length} subscriptions for user ${userId}`
    )
  }

  private async sendNotificationToSubscription(
    subscription: PushSubscription,
    payload: NotificationPayload
  ) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }

    return webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: 'normal'
      }
    )
  }

  static generateVapidKeys() {
    return webpush.generateVAPIDKeys()
  }
} 