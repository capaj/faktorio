import { useAuth } from '../lib/AuthContext'
import { PushNotificationToggle } from '../components/PushNotificationToggle'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import { trpcClient } from '../lib/trpcClient'
import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Copy as CopyIcon, Trash2, Plus } from 'lucide-react'

export function SettingsPage() {
  const { token } = useAuth()
  const isLocalUser = token?.startsWith('local_')

  // Detect Brave browser
  const isBrave =
    navigator.userAgent.includes('Brave') ||
    (navigator as any).brave !== undefined

  const tokensQuery = trpcClient.apiTokens.list.useQuery(undefined, {
    refetchOnWindowFocus: false
  })
  const utils = trpcClient.useUtils()
  const createToken = trpcClient.apiTokens.create.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate()
  })
  const deleteToken = trpcClient.apiTokens.delete.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate()
  })

  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

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

              {isBrave && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Brave Browser:</strong> Push notifikace nemusí
                    fungovat správně. Doporučujeme použít Firefox,Edge nebo
                    Chrome pro nejlepší funkčnost.
                  </p>
                </div>
              )}

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API tokeny</CardTitle>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => createToken.mutate()}
              disabled={createToken.isPending}
            >
              <Plus className="w-4 h-4 mr-1" /> Vytvořit nový token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            Tokeny umožňují přístup k Public API. Posílejte je v hlavičce
            <code className="ml-1">X-API-KEY</code>. Api dokumentace je k
            dispozici na{' '}
            <a
              href="https://api.faktorio.cz/swagger"
              target="_blank"
              rel="noreferrer"
            >
              https://api.faktorio.cz/swagger
            </a>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Vytvořen</TableHead>
                  <TableHead className="w-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokensQuery.data?.map((t) => {
                  const isRevealed = !!revealed[t.token]
                  const masked = `${t.token.slice(0, 4)}…${t.token.slice(-4)}`
                  return (
                    <TableRow key={t.token}>
                      <TableCell className="max-w-[520px]">
                        <div className="flex items-center gap-2">
                          <code className="text-xs break-all">
                            {isRevealed ? t.token : masked}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() =>
                              setRevealed((prev) => ({
                                ...prev,
                                [t.token]: !prev[t.token]
                              }))
                            }
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" /> Skrýt
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" /> Zobrazit
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={async () => {
                              await navigator.clipboard.writeText(t.token)
                              toast.success('Token zkopírován do schránky')
                            }}
                          >
                            <CopyIcon className="w-4 h-4 mr-1" /> Kopírovat
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {t.created_at}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => deleteToken.mutate({ token: t.token })}
                          disabled={deleteToken.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Smazat
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {tokensQuery.data && tokensQuery.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <span className="text-sm text-muted-foreground">
                        Zatím nemáte žádné tokeny.
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
