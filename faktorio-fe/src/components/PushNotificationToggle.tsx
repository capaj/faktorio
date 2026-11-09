import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Send } from 'lucide-react'
import { pushNotificationService } from '@/lib/pushNotificationService'
import { toast } from 'sonner'

export function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)

  useEffect(() => {
    async function initializeAndCheck() {
      try {
        // First initialize the service worker
        const supported = await pushNotificationService.initialize()
        setIsSupported(supported)

        // Only check subscription if supported
        if (supported) {
          const subscribed = await pushNotificationService.isSubscribed()
          setIsSubscribed(subscribed)
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error)
        setIsSupported(false)
        setIsSubscribed(false)
      }
    }

    initializeAndCheck()
  }, [])

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

  const handleSendTest = async () => {
    setIsSendingTest(true)
    try {
      await pushNotificationService.sendTestNotification()
      toast.success('Testovací notifikace byla odeslána')
    } catch (error) {
      toast.error(
        'Testovací notifikaci se nepodařilo odeslat' +
          (error instanceof Error ? ': ' + error.message : '')
      )
    } finally {
      setIsSendingTest(false)
    }
  }

  if (!isSupported) {
    return null // Don't render anything if not supported
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendTest}
          disabled={isSendingTest}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Odeslat testovací notifikaci
        </Button>
      )}
    </div>
  )
}
