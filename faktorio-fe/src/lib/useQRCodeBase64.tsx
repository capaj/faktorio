import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const useQRCodeBase64 = (data: string) => {
  const [base64URL, setBase64URL] = useState('')

  useEffect(() => {
    // Only proceed if data is provided
    if (!data) return

    // Create a canvas element
    const canvas = document.createElement('canvas')
    document.body.appendChild(canvas)

    // Generate the QR code on the canvas
    QRCode.toCanvas(canvas, data, (error: any) => {
      if (error) {
        console.error('Error generating QR code:', error)
        return
      }

      // Convert the canvas to a base64 URL
      const base64Image = canvas.toDataURL('image/png')
      setBase64URL(base64Image)

      // Remove the canvas from the document
      document.body.removeChild(canvas)
    })

    // Cleanup function to remove canvas if component unmounts early
    return () => {
      if (canvas) {
        try {
          document.body.removeChild(canvas)
        } catch (err) {
          console.warn('Error removing canvas:', err)
        }
      }
    }
  }, [data])

  return base64URL
}
