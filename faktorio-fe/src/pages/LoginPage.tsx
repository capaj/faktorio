import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useLocation } from 'wouter'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '../components/ui/card'
import { toast } from 'sonner'
import { ButtonLink } from '../components/ui/link'
import { GoogleLogin, GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google'
import { PasswordInput } from '@/components/ui/password-input'
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const [, navigate] = useLocation()

  // Add script with hl parameter for Czech language
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client?hl=cs'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Přihlášení úspěšné')
      navigate('/')
    } catch (error) {
      toast.error(
        'Přihlášení selhalo. Zkontrolujte své údaje a zkuste to znovu.'
      )
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true)
      if (credentialResponse.credential) {
        await login('', '', credentialResponse.credential)
        toast.success('Přihlášení úspěšné')
        navigate('/')
      }
    } catch (error) {
      toast.error('Přihlášení pomocí Google selhalo.')
      console.error('Google login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Přihlášení pomocí Google selhalo.')
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přihlášení</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <GoogleOAuthProvider clientId={clientId}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  text="signin_with"
                  shape="rectangular"
                  type="standard"
                  width="280"
                />
              </GoogleOAuthProvider>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Nebo zadejte své přihlašovací údaje
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>

              <PasswordInput
                id="password"
                value={password}

                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
            </Button>
            <div className="text-right text-sm">
              Zapomněli jste heslo?{' '}
              <ButtonLink
                href="/request-password-reset"
                className="p-0 h-auto text-sm"
              >
                Resetovat heslo
              </ButtonLink>
            </div>
            <div className="text-center text-sm">
              Nemáte účet?{' '}
              <ButtonLink href="/signup" variant="link" className="p-0">
                Zaregistrujte se
              </ButtonLink>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
