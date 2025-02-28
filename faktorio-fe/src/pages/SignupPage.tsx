import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
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
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signup, googleSignup } = useAuth()
  const [, navigate] = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      await signup(email, fullName, password)
      toast.success('Registrace úspěšná')
      navigate('/')
    } catch (error: any) {
      if (error.message?.endsWith(' already exists')) {
        toast.error('Uživatel s tímto emailem již existuje')
      } else {
        toast.error('Registrace selhala. Zkuste to prosím znovu.')
      }
      console.error('Signup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true)
      if (credentialResponse.credential) {
        await googleSignup(credentialResponse.credential)
        toast.success('Registrace úspěšná')
        navigate('/')
      }
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        toast.error('Uživatel s tímto emailem již existuje')
      } else {
        toast.error('Registrace pomocí Google selhala.')
      }
      console.error('Google signup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    // toast.error('Registrace pomocí Google selhala.')
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Registrace</CardTitle>
          <CardDescription>Vytvořte si nový účet</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <Label htmlFor="fullName">Celé jméno</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan Novák"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Nebo se zaregistrujte pomocí
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleOAuthProvider clientId="652541081757-chbj3hkclmff7vsfnq3ttuqvo70i0lje.apps.googleusercontent.com">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  text="signup_with"
                  shape="rectangular"
                  locale="cs_CZ"
                />
              </GoogleOAuthProvider>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registrace...' : 'Zaregistrovat se'}
            </Button>
            <div className="text-center text-sm">
              Již máte účet?{' '}
              <ButtonLink href="/login" variant="link" className="p-0">
                Přihlaste se
              </ButtonLink>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
