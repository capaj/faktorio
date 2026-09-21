import type { SendEmail } from '@cloudflare/workers-types'

export type EmailData = {
  to: { email: string; name: string }
  subject: string
  html: string
  text?: string
  replyTo?: { email: string; name: string }
}

export async function sendEmail(
  emailData: EmailData,
  env: { SEND_EMAIL?: SendEmail }
): Promise<void> {
  if (!env.SEND_EMAIL) {
    throw new Error('Cloudflare SEND_EMAIL binding is not configured')
  }

  const { messageId } = await env.SEND_EMAIL.send({
    from: { email: 'no-reply@faktorio.cz', name: 'Faktorio' },
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    ...(emailData.text ? { text: emailData.text } : {}),
    ...(emailData.replyTo ? { replyTo: emailData.replyTo } : {})
  })

  console.log('Email accepted by Cloudflare Email Service:', messageId)
}
