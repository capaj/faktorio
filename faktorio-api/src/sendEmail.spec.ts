import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendEmail } from './sendEmail'

const email = {
  to: { email: 'user@example.com', name: 'Jan Novák' },
  subject: 'Obnovení hesla',
  html: '<a href="https://faktorio.cz/reset-password?token=test">Obnovit heslo</a>'
}

afterEach(() => vi.restoreAllMocks())

describe('Cloudflare email delivery', () => {
  it('submits the password-reset content and logs only the message ID', async () => {
    const send = vi.fn().mockResolvedValue({ messageId: 'message-123' })
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await sendEmail(email, { SEND_EMAIL: { send } })

    expect(send).toHaveBeenCalledExactlyOnceWith({
      from: { email: 'no-reply@faktorio.cz', name: 'Faktorio' },
      ...email
    })
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Email accepted by Cloudflare Email Service:',
      'message-123'
    )
  })

  it('propagates delivery failures without logging the environment or claiming success', async () => {
    const failure = new Error('Email service unavailable')
    const send = vi.fn().mockRejectedValue(failure)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = { SEND_EMAIL: { send }, JWT_SECRET: 'must-not-be-logged' }

    await expect(sendEmail(email, env)).rejects.toBe(failure)

    expect(log).not.toHaveBeenCalled()
    expect(errorLog).not.toHaveBeenCalled()
  })

  it('fails explicitly when the Worker binding is missing', async () => {
    await expect(sendEmail(email, {})).rejects.toThrow(
      'Cloudflare SEND_EMAIL binding is not configured'
    )
  })
})
