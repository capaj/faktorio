import { useAuth } from '../lib/AuthContext'
import { PushNotificationToggle } from '../components/PushNotificationToggle'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export function SettingsPage() {
  const { token } = useAuth()
  const isLocalUser = token?.startsWith('local_')

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const apiUrl = import.meta.env.VITE_API_URL

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

              <PushNotificationToggle />
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
