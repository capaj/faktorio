import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { Link, useLocation } from 'wouter'
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

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const [, navigate] = useLocation()

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

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přihlášení</CardTitle>
          <CardDescription>Zadejte své přihlašovací údaje</CardDescription>
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
              <Label htmlFor="password">Heslo</Label>

              <Input
                id="password"
                type="password"
                value={password}
                tabIndex={-1}
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
