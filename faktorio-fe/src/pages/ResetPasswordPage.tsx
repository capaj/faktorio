import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../components/ui/card'
import { toast } from 'sonner'
import { ButtonLink } from '../components/ui/link'
import { trpcClient } from '../lib/trpcClient'
import { SpinnerContainer } from '../components/SpinnerContainer'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [, navigate] = useLocation()

  const verifyTokenQuery = trpcClient.auth.verifyResetToken.useQuery(
    { token: token || '' },
    {
      enabled: !!token
    }
  )
  const [isTokenValid, setIsTokenValid] = useState(verifyTokenQuery.data?.valid)


  const setNewPasswordMutation = trpcClient.auth.setNewPassword.useMutation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    setToken(tokenParam)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Neplatný token pro obnovení hesla')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Hesla se neshodují')
      return
    }

    if (password.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků')
      return
    }

    setIsLoading(true)

    try {
      await setNewPasswordMutation.mutateAsync({
        token,
        password
      })
      toast.success('Heslo bylo úspěšně změněno')
      navigate('/login')
    } catch (error: any) {
      toast.error('Změna hesla selhala. Zkuste to prosím znovu.')
      console.error('Reset password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (verifyTokenQuery.isLoading) {
    return <SpinnerContainer loading={true} />
  }

  if (!isTokenValid) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Neplatný odkaz</CardTitle>
            <CardDescription>
              Odkaz pro obnovení hesla je neplatný nebo vypršel
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <ButtonLink href="/request-password-reset" className="w-full">
              Požádat o nový odkaz
            </ButtonLink>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nastavení nového hesla</CardTitle>
          <CardDescription>Zadejte své nové heslo</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nové heslo</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Ukládání...' : 'Nastavit nové heslo'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
