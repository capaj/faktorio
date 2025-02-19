import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const useQRCodeBase64 = (data: string) => {
  const [base64URL, setBase64URL] = useState('')

  useEffect(() => {
    if (!data) return

    QRCode.toDataURL(data)
      .then((url) => {
        setBase64URL(url)
      })
      .catch((err) => {
        console.error('Error generating QR code:', err)
      })
  }, [data])

  return base64URL
}
