import { pushSubscriptionTb } from 'faktorio-db/schema'
import { eq } from 'drizzle-orm'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from 'faktorio-db/schema'
import {
  sendPushNotification,
  WebPushError,
  type SendPushOptions,
  type VapidDetails
} from './webPush'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

type PushSubscriptionRow = typeof pushSubscriptionTb.$inferSelect

export interface SendResult {
  total: number
  sent: number
  removed: number
  failed: number
}

export class WebPushService {
  constructor(
    private db: LibSQLDatabase<typeof schema>,
    private vapidKeys: VapidDetails
  ) {}

  async sendNotificationToUser(
    userId: string,
    payload: NotificationPayload,
    options?: SendPushOptions
  ): Promise<SendResult> {
    const subscriptions = await this.db
      .select()
      .from(pushSubscriptionTb)
      .where(eq(pushSubscriptionTb.user_id, userId))

    const result: SendResult = {
      total: subscriptions.length,
      sent: 0,
      removed: 0,
      failed: 0
    }

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`)
      return result
    }

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        this.sendNotificationToSubscription(subscription, payload, options)
      )
    )

    for (const [index, settled] of results.entries()) {
      const subscription = subscriptions[index]
      if (settled.status === 'fulfilled') {
        result.sent++
        continue
      }

      const error = settled.reason
      // Only drop subscriptions the push service reports as gone. Other errors
      // (rate limits, outages, bad VAPID config) must not unsubscribe users.
      if (error instanceof WebPushError && error.isGone) {
        console.log(`Removing expired subscription: ${subscription.endpoint}`)
        await this.db
          .delete(pushSubscriptionTb)
          .where(eq(pushSubscriptionTb.id, subscription.id))
        result.removed++
      } else {
        console.error(
          `Failed to send push notification to ${subscription.endpoint}:`,
          error
        )
        result.failed++
      }
    }

    console.log(
      `Sent notification to ${result.sent}/${result.total} subscriptions for user ${userId}`
    )
    return result
  }

  private async sendNotificationToSubscription(
    subscription: PushSubscriptionRow,
    payload: NotificationPayload,
    options?: SendPushOptions
  ) {
    return sendPushNotification(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth
      },
      JSON.stringify(payload),
      this.vapidKeys,
      { ttl: 24 * 60 * 60, urgency: 'normal', ...options }
    )
  }
}
