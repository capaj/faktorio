import { eq, and, lte, isNull, inArray } from 'drizzle-orm'
import { invoicesTb, pushSubscriptionTb, userT } from 'faktorio-db/schema'
import { WebPushService } from './webPushService'
import { djs } from 'faktorio-shared/src/djs'

import type { Env } from '../envSchema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from 'faktorio-db/schema'

export async function checkAndNotifyDueInvoices(
  db: LibSQLDatabase<typeof schema>,
  env: Env
) {
  console.log('Starting scheduled check for due invoices...')

  const webPushService = new WebPushService(db, {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT
  })

  const now = djs().tz('Europe/Prague')
  const today = now.format('YYYY-MM-DD')
  const tomorrow = now.add(1, 'day').format('YYYY-MM-DD')

  // Unpaid invoices that are overdue or due today/tomorrow, only for users
  // who have at least one push subscription
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
        isNull(invoicesTb.cancelled_at),
        inArray(
          invoicesTb.user_id,
          db
            .selectDistinct({ userId: pushSubscriptionTb.user_id })
            .from(pushSubscriptionTb)
        )
      )
    )

  if (dueInvoicesWithUsers.length === 0) {
    console.log('No due invoices found')
    return
  }

  // Group invoices by user
  interface GroupedInvoices {
    user: {
      id: string
      name: string | null
      email: string | null
    }
    invoices: {
      id: string
      number: string
      clientName: string
      dueOn: string
      total: number
      currency: string
    }[]
  }

  const invoicesByUser = dueInvoicesWithUsers.reduce(
    (acc, invoice) => {
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
    },
    {} as Record<string, GroupedInvoices>
  )

  console.log(
    `Found due invoices for ${Object.keys(invoicesByUser).length} users`
  )

  // Send notifications for each user
  for (const [userId, userData] of Object.entries(invoicesByUser)) {
    const { user, invoices } = userData

    try {
      const { title, body } = buildDueInvoicesMessage(invoices, today, tomorrow)

      await webPushService.sendNotificationToUser(userId, {
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/faktura.png',
        tag: 'due_invoices',
        data: {
          type: 'due_invoices',
          invoices: invoices.map((inv) => ({
            id: inv.id,
            number: inv.number
          })),
          url: '/'
        },
        actions: [
          {
            action: 'view',
            title: 'Zobrazit faktury'
          }
        ]
      })

      console.log(
        `Notification sent to user ${user.name} (${user.email}) for ${invoices.length} due invoices`
      )
    } catch (error) {
      console.error(`Failed to send notification to user ${user.name}:`, error)
    }
  }

  console.log('Scheduled notification check completed')
}

type DueInvoice = { number: string; clientName: string; dueOn: string }

function czechInvoiceCount(count: number) {
  if (count === 1) return '1 faktura'
  if (count >= 2 && count <= 4) return `${count} faktury`
  return `${count} faktur`
}

function describeInvoices(invoices: DueInvoice[]) {
  if (invoices.length === 1) {
    return `${invoices[0].number} (${invoices[0].clientName})`
  }
  const listed = invoices
    .slice(0, 3)
    .map((inv) => inv.number)
    .join(', ')
  return invoices.length > 3 ? `${listed} a další` : listed
}

export function buildDueInvoicesMessage(
  invoices: DueInvoice[],
  today: string,
  tomorrow: string
): { title: string; body: string } {
  const overdue = invoices.filter((inv) => inv.dueOn < today)
  const dueToday = invoices.filter((inv) => inv.dueOn === today)
  const dueTomorrow = invoices.filter((inv) => inv.dueOn === tomorrow)

  const groups = [
    { items: overdue, label: 'po splatnosti' },
    { items: dueToday, label: 'splatné dnes' },
    { items: dueTomorrow, label: 'splatné zítra' }
  ].filter((group) => group.items.length > 0)

  if (groups.length === 1) {
    const [{ items, label }] = groups
    const verb = items.length >= 2 && items.length <= 4 ? 'jsou' : 'je'
    const subject =
      items.length === 1 ? 'Faktura' : czechInvoiceCount(items.length)
    return {
      title: `${subject} ${verb} ${label}`,
      body: describeInvoices(items)
    }
  }

  return {
    title: `Nezaplacené faktury: ${invoices.length}`,
    body: groups
      .map(({ items, label }) => `${items.length} ${label}`)
      .join(', ')
  }
}
