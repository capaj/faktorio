import { describe, it, expect } from 'vitest'
import {
  base64UrlDecode,
  base64UrlEncode,
  createVapidAuthorization,
  encryptPayload,
  generateVapidKeys
} from './webPush'
import { buildDueInvoicesMessage } from './scheduledNotifications'

// RFC 8291 Appendix A test vector
const rfc = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  asPublic:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  uaPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  authSecret: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'
}

async function importEcdhKeyPair(publicKey: string, privateKey: string) {
  const pub = base64UrlDecode(publicKey)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(pub.slice(1, 33)),
    y: base64UrlEncode(pub.slice(33, 65))
  }
  const alg = { name: 'ECDH', namedCurve: 'P-256' }
  return {
    publicKey: await crypto.subtle.importKey('jwk', jwk, alg, true, []),
    privateKey: await crypto.subtle.importKey(
      'jwk',
      { ...jwk, d: privateKey },
      alg,
      true,
      ['deriveBits']
    )
  } as CryptoKeyPair
}

describe('web push encryption', () => {
  it('matches the RFC 8291 test vector', async () => {
    const body = await encryptPayload(
      new TextEncoder().encode(rfc.plaintext),
      { p256dh: rfc.uaPublic, auth: rfc.authSecret },
      {
        localKeyPair: await importEcdhKeyPair(rfc.asPublic, rfc.asPrivate),
        salt: base64UrlDecode(rfc.salt)
      }
    )
    expect(base64UrlEncode(body)).toBe(rfc.body)
  })

  it('accepts standard base64 subscription keys', async () => {
    const toStd = (v: string) =>
      btoa(String.fromCharCode(...base64UrlDecode(v)))
    const body = await encryptPayload(new TextEncoder().encode('hi'), {
      p256dh: toStd(rfc.uaPublic),
      auth: toStd(rfc.authSecret)
    })
    expect(body.length).toBe(16 + 4 + 1 + 65 + 2 + 1 + 16)
  })
})

describe('VAPID', () => {
  it('produces a verifiable ES256 JWT', async () => {
    const keys = await generateVapidKeys()
    const header = await createVapidAuthorization(
      'https://fcm.googleapis.com/fcm/send/abc',
      { ...keys, subject: 'admin@faktorio.cz' }
    )
    const match = header.match(/^vapid t=([^,]+), k=(.+)$/)
    expect(match).not.toBeNull()
    const [, jwt, k] = match!
    expect(k).toBe(keys.publicKey)

    const [h, p, s] = jwt.split('.')
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(p)))
    expect(claims.aud).toBe('https://fcm.googleapis.com')
    expect(claims.sub).toBe('mailto:admin@faktorio.cz')
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000)

    const publicKey = await crypto.subtle.importKey(
      'raw',
      base64UrlDecode(keys.publicKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      base64UrlDecode(s),
      new TextEncoder().encode(`${h}.${p}`)
    )
    expect(valid).toBe(true)
  })
})

describe('buildDueInvoicesMessage', () => {
  const today = '2026-11-10'
  const tomorrow = '2026-11-11'
  const inv = (number: string, dueOn: string) => ({
    number,
    clientName: 'ACME',
    dueOn
  })

  it('describes overdue-only invoices', () => {
    expect(
      buildDueInvoicesMessage([inv('2026-001', '2026-10-01')], today, tomorrow)
    ).toEqual({
      title: 'Faktura je po splatnosti',
      body: '2026-001 (ACME)'
    })
  })

  it('uses Czech plural forms', () => {
    const many = Array.from({ length: 5 }, (_, i) => inv(`F${i}`, today))
    expect(buildDueInvoicesMessage(many, today, tomorrow).title).toBe(
      '5 faktur je splatné dnes'
    )
    expect(
      buildDueInvoicesMessage(many.slice(0, 2), today, tomorrow).title
    ).toBe('2 faktury jsou splatné dnes')
  })

  it('summarizes mixed groups', () => {
    expect(
      buildDueInvoicesMessage(
        [inv('A', '2026-11-01'), inv('B', today), inv('C', tomorrow)],
        today,
        tomorrow
      )
    ).toEqual({
      title: 'Nezaplacené faktury: 3',
      body: '1 po splatnosti, 1 splatné dnes, 1 splatné zítra'
    })
  })
})
