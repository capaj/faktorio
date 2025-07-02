import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { pushNotificationService } from '@/lib/pushNotificationService'
import { toast } from 'sonner'

export function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    checkSupport()
    checkSubscriptionStatus()
  }, [])

  const checkSupport = async () => {
    const supported = await pushNotificationService.initialize()
    setIsSupported(supported)
  }

  const checkSubscriptionStatus = async () => {
    try {
      const subscribed = await pushNotificationService.isSubscribed()
      setIsSubscribed(subscribed)
    } catch (error) {
      console.error('Error checking subscription status:', error)
    }
  }

  const handleToggle = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser')
      return
    }

    setIsLoading(true)
    try {
      if (isSubscribed) {
        await pushNotificationService.unsubscribe()
        setIsSubscribed(false)
        toast.success('Notifikace o splatných fakturách byly vypnuty')
      } else {
        await pushNotificationService.subscribe()
        setIsSubscribed(true)
        toast.success('Notifikace o splatných fakturách byly zapnuty')
      }
    } catch (error) {
      console.error('Error toggling notification subscription:', error)

      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          toast.error(
            'Povolení pro notifikace bylo zamítnuto. Povolte notifikace v nastavení prohlížeče.'
          )
        } else {
          toast.error(
            'Nastala chyba při nastavování notifikací: ' + error.message
          )
        }
      } else {
        toast.error('Nastala chyba při nastavování notifikací')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return null // Don't render anything if not supported
  }

  return (
    <Button
      variant={isSubscribed ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <Bell className="h-4 w-4" />
          Notifikace zapnuty
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Zapnout notifikace
        </>
      )}
    </Button>
  )
}
