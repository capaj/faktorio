import { eq, and, lte, isNull } from 'drizzle-orm'
import { invoicesTb, userT } from '../schema'
import { WebPushService } from './webPushService'
import { djs } from 'faktorio-shared/src/djs'

import type { Env } from '../envSchema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '../schema'

export async function checkAndNotifyDueInvoices(db: LibSQLDatabase<typeof schema>, env: Env) {
  console.log('Starting scheduled check for due invoices...')

  const webPushService = new WebPushService(db, {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT
  })

  const today = djs().format('YYYY-MM-DD')
  const tomorrow = djs().add(1, 'day').format('YYYY-MM-DD')

  // Get all users with due invoices (due today or tomorrow)
  const dueInvoicesWithUsers = await db
    .select({
      userId: invoicesTb.user_id,
      userName: userT.name,
      userEmail: userT.email,
      invoiceId: invoicesTb.id,
      invoiceNumber: invoicesTb.number,
      clientName: invoicesTb.client_name,
      dueOn: invoicesTb.due_on,
      total: invoicesTb.total,
      currency: invoicesTb.currency
    })
    .from(invoicesTb)
    .leftJoin(userT, eq(invoicesTb.user_id, userT.id))
    .where(
      and(
        lte(invoicesTb.due_on, tomorrow),
        isNull(invoicesTb.paid_on),
        isNull(invoicesTb.cancelled_at)
      )
    )

  if (dueInvoicesWithUsers.length === 0) {
    console.log('No due invoices found')
    return
  }

  // Group invoices by user
  const invoicesByUser = dueInvoicesWithUsers.reduce((acc, invoice) => {
    if (!acc[invoice.userId]) {
      acc[invoice.userId] = {
        user: {
          id: invoice.userId,
          name: invoice.userName,
          email: invoice.userEmail
        },
        invoices: []
      }
    }

    acc[invoice.userId].invoices.push({
      id: invoice.invoiceId,
      number: invoice.invoiceNumber,
      clientName: invoice.clientName,
      dueOn: invoice.dueOn,
      total: invoice.total,
      currency: invoice.currency
    })

    return acc
  }, {} as Record<string, any>)

  console.log(`Found due invoices for ${Object.keys(invoicesByUser).length} users`)

  // Send notifications for each user
  for (const [userId, userData] of Object.entries(invoicesByUser)) {
    const { user, invoices } = userData as any

    try {
      const dueToday = invoices.filter((inv: any) => inv.dueOn === today)
      const dueTomorrow = invoices.filter((inv: any) => inv.dueOn === tomorrow)

      let title = ''
      let body = ''

      if (dueToday.length > 0 && dueTomorrow.length > 0) {
        title = `${dueToday.length + dueTomorrow.length} faktury jsou splatné`
        body = `${dueToday.length} dnes, ${dueTomorrow.length} zítra`
      } else if (dueToday.length > 0) {
        title = dueToday.length === 1 ? 'Faktura je splatná dnes' : `${dueToday.length} faktury jsou splatné dnes`
        body = dueToday.length === 1
          ? `Faktura ${dueToday[0].number} pro ${dueToday[0].clientName}`
          : dueToday.map((inv: any) => `${inv.number} (${inv.clientName})`).join(', ')
      } else if (dueTomorrow.length > 0) {
        title = dueTomorrow.length === 1 ? 'Faktura je splatná zítra' : `${dueTomorrow.length} faktury jsou splatné zítra`
        body = dueTomorrow.length === 1
          ? `Faktura ${dueTomorrow[0].number} pro ${dueTomorrow[0].clientName}`
          : dueTomorrow.map((inv: any) => `${inv.number} (${inv.clientName})`).join(', ')
      }

      await webPushService.sendNotificationToUser(userId, {
        title,
        body,
        icon: '/faktura.png',
        badge: '/faktura.png',
        data: {
          type: 'due_invoices',
          invoices: invoices.map((inv: any) => ({ id: inv.id, number: inv.number })),
          url: '/'
        },
        actions: [
          {
            action: 'view',
            title: 'Zobrazit faktury'
          }
        ]
      })

      console.log(`Notification sent to user ${user.name} (${user.email}) for ${invoices.length} due invoices`)
    } catch (error) {
      console.error(`Failed to send notification to user ${user.name}:`, error)
    }
  }

  console.log('Scheduled notification check completed')
} 