import { generateVapidKeys } from '../src/lib/webPush'

generateVapidKeys().then((vapidKeys) => {
  console.log('VAPID Keys generated:')
  console.log('====================')
  console.log('Public Key:', vapidKeys.publicKey)
  console.log('Private Key:', vapidKeys.privateKey)
  console.log('')
  console.log('Add these to your environment variables:')
  console.log('=========================================')
  console.log('API (.dev.vars or secrets):')
  console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`)
  console.log(`VAPID_SUBJECT="mailto:your-email@example.com"`)
  console.log('')
  console.log('Frontend (.env.local):')
  console.log(`VITE_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
})
