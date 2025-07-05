import { useAuth } from '../lib/AuthContext'
import { PushNotificationToggle } from '../components/PushNotificationToggle'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { pushNotificationService } from '../lib/pushNotificationService'

export function SettingsPage() {
  const { token } = useAuth()
  const isLocalUser = token?.startsWith('local_')

  const handleTestPushService = async () => {
    await pushNotificationService.testPushService()
  }

  const handleClearServiceWorker = async () => {
    const success = await pushNotificationService.clearAndReregister()
    if (success) {
      console.log('Service worker cleared and re-registered successfully')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nastavení</h1>

      {!isLocalUser && (
        <Card>
          <CardHeader>
            <CardTitle>Notifikace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Zapněte si upozornění na splatné faktury přímo do prohlížeče.
              </p>

              {/* Debug information */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  Service Worker podpora:{' '}
                  {'serviceWorker' in navigator ? '✅' : '❌'}
                </div>
                <div>
                  Push Manager podpora: {'PushManager' in window ? '✅' : '❌'}
                </div>
                <div>
                  Notification podpora: {'Notification' in window ? '✅' : '❌'}
                </div>
                <div>
                  Notification oprávnění:{' '}
                  {typeof Notification !== 'undefined'
                    ? Notification.permission
                    : 'N/A'}
                </div>
              </div>

              <div className="flex gap-2">
                <PushNotificationToggle />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestPushService}
                >
                  Test Push Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearServiceWorker}
                >
                  Clear SW Cache
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLocalUser && (
        <Card>
          <CardHeader>
            <CardTitle>Lokální uživatel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Push notifikace nejsou dostupné pro lokální uživatele.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
