import { z } from 'zod'
import { useState } from 'react'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, 'Aktuální heslo musí mít alespoň 6 znaků'),
    newPassword: z.string().min(6, 'Nové heslo musí mít alespoň 6 znaků'),
    confirmPassword: z
      .string()
      .min(6, 'Potvrzení hesla musí mít alespoň 6 znaků')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Hesla se neshodují',
    path: ['confirmPassword']
  })

const changeEmailSchema = z.object({
  newEmail: z.string().email('Zadejte platný email'),
  currentPassword: z.string().min(6, 'Aktuální heslo musí mít alespoň 6 znaků')
})

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>

export const ManageLoginDetails = () => {
  const { user } = useAuth()
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  const changePasswordMutation = trpcClient.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Heslo bylo úspěšně změněno')
      passwordForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Změna hesla se nezdařila')
    }
  })

  const changeEmailMutation = trpcClient.auth.changeEmail.useMutation({
    onSuccess: (data) => {
      toast.success('Přihlašovací email úspěšně změněn')
      emailForm.reset()

      // Update the stored token with the new one
      if (data.token) {
        localStorage.setItem('authToken', data.token)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Změna emailu se nezdařila')
    }
  })

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const emailForm = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: ''
    }
  })

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setIsPasswordLoading(true)
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const onEmailSubmit = async (values: ChangeEmailFormValues) => {
    setIsEmailLoading(true)
    try {
      await changeEmailMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newEmail: values.newEmail
      })
    } finally {
      setIsEmailLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Správa přihlašovacích údajů</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Změna hesla</h3>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-6"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aktuální heslo</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nové heslo</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potvrzení nového hesla</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <FkButton type="submit" isLoading={isPasswordLoading}>
                  Změnit heslo
                </FkButton>
              </div>
            </form>
          </Form>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Přihlašovací email</h3>

          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium text-muted-foreground">
              Aktuální email
            </p>
            <p className="font-medium">{user?.email}</p>
          </div>

          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-6"
            >
              <FormField
                control={emailForm.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nový email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aktuální heslo</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <FkButton type="submit" isLoading={isEmailLoading}>
                  Změnit email
                </FkButton>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  )
}
