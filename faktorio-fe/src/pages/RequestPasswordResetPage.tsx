import { useState } from 'react'
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

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const resetPasswordMutation = trpcClient.auth.resetPassword.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await resetPasswordMutation.mutateAsync({ email })
      toast.success(
        'Pokud je email registrován, byl odeslán odkaz pro obnovení hesla'
      )
      setEmail('')
    } catch (error: any) {
      toast.error('Došlo k chybě. Zkuste to prosím znovu.')
      console.error('Reset password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Obnovení hesla</CardTitle>
          <CardDescription>
            Zadejte svůj email a my vám pošleme odkaz pro obnovení hesla
          </CardDescription>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Odesílání...' : 'Odeslat odkaz pro obnovení'}
            </Button>
            <div className="text-center text-sm">
              Vzpomněli jste si na heslo?{' '}
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
