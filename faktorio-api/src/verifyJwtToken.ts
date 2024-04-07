// const publicKey = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0aB2UX8USw+6f+eVO+ut
// TD/fFXKg3SQ/Yte6O0FUcyfpnDpFHWKD324BptsO56d3wOJgStg8t2rCSijuMDpz
// JpgXqA7IUw4wa8510k9c6hziG26ZW8nn1ywNELYfYWf0M+8siiwY7H79FNW8WeQ0
// 3Ny2ylFfOevsy/wbK6P0iMJmxJ1x+qjRDvPW8s4k/q5haX7W+iam+nTyBetDvzBB
// YP2wCVnoJKc8xPRcgSLVpnMuHJ9vJ6GTauUqCekGP8l8EvVVIuIqjf0x1NaazGwi
// NJCZbjlROUAYbfrqqhLGexChVclm8oQG6Zh9c25dY/pIhH4NMb9T347Ovu/IBHkN
// 4wIDAQAB
// -----END PUBLIC KEY-----`

const publicKeyProd = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1q4TtnKL/7by4DopSiAL
dXm3OEKJ3qoL2it3ZtU1bqMfPoPSRJwBMcaV+DfqgS3qzW2wttkjKf770ZY33ZeO
oMAbE4NGFvZBaug4dCh0ZFhxMZpgxF6hLtGK0rsjoeIA7BHZ54Oam8C5oua5bz7Z
0/F08c2rP0Yo6BV4E54EsoLHV2GHMj3VxjvqRuR9OFHRcamKaWXxKavNKQF+TMyx
AWpre2ef717kfMosGpok4Zm5oIUhIbeXipCSVQBg5UlRaqVjDU+sUG4k/6ZfPjhA
VIjvmoarYatC6kMqwNrLmsE6b3lXwaOrDX2naWIX3Zd9OeXufapqoBMYSk8Tl8yK
/wIDAQAB
-----END PUBLIC KEY-----
`
function uint8ArrayFromBase64Url(base64Url: string) {
  // Base64-URL to Base64
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  // Pad with "=" to make the base64 string length a multiple of 4
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '='
  )
  // Base64 to binary string
  const binaryStr = atob(padded)
  // Binary string to Uint8Array
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

async function verifyToken(token: string) {
  const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.')
  // Convert the signature and fetch the public key
  const signatureUint8Array = uint8ArrayFromBase64Url(signatureEncoded)

  // Prepare the data (header + payload) for verification
  const data = new TextEncoder().encode(
    [headerEncoded, payloadEncoded].join('.')
  )

  // Verify the signature
  const isValid = await crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    publicKey: publicKeyProd, // from getPublicKey(), converted to CryptoKey
    signatureUint8Array,
    data
  )

  return isValid
}
