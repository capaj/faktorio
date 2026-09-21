import type { SendEmail } from '@cloudflare/workers-types'

export async function sendEmail(
  emailData: {
    to: { email: string; name: string }
    subject: string
    html: string
  },
  env: { SEND_EMAIL?: SendEmail }
): Promise<void> {
  if (!env.SEND_EMAIL) {
    throw new Error('Cloudflare SEND_EMAIL binding is not configured')
  }

  const { messageId } = await env.SEND_EMAIL.send({
    from: { email: 'no-reply@faktorio.cz', name: 'Faktorio' },
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html
  })

  console.log('Email accepted by Cloudflare Email Service:', messageId)
}
