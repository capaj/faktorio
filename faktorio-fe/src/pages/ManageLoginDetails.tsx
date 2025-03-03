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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

const deleteAccountPasswordSchema = z.object({
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků')
})

const deleteAccountConfirmSchema = z.object({
  confirmText: z.string().refine((value) => value.toLowerCase() === 'ano', {
    message: 'Pro potvrzení je nutné zadat "ano"'
  })
})

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>
type DeleteAccountPasswordFormValues = z.infer<
  typeof deleteAccountPasswordSchema
>
type DeleteAccountConfirmFormValues = z.infer<typeof deleteAccountConfirmSchema>

export const ManageLoginDetails = () => {
  const { user, logout } = useAuth()
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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

  const deleteAccountMutation = trpcClient.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success('Váš účet byl úspěšně smazán')
      logout()
      window.location.href = '/'
    },
    onError: (error: any) => {
      toast.error(error.message || 'Smazání účtu se nezdařilo')
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

  const deleteAccountPasswordForm = useForm<DeleteAccountPasswordFormValues>({
    resolver: zodResolver(deleteAccountPasswordSchema),
    defaultValues: {
      password: ''
    }
  })

  const deleteAccountConfirmForm = useForm<DeleteAccountConfirmFormValues>({
    resolver: zodResolver(deleteAccountConfirmSchema),
    defaultValues: {
      confirmText: ''
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

  const onDeleteAccountPasswordSubmit = async (
    values: DeleteAccountPasswordFormValues
  ) => {
    setIsDeleteDialogOpen(false)
    try {
      await deleteAccountMutation.mutateAsync({
        password: values.password
      })
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  }

  const onDeleteAccountConfirmSubmit = async (
    values: DeleteAccountConfirmFormValues
  ) => {
    setIsDeleteDialogOpen(false)
    try {
      await deleteAccountMutation.mutateAsync({
        confirmText: values.confirmText
      })
    } catch (error) {
      // Error is handled by the mutation's onError
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
                <FkButton
                  type="submit"
                  isLoading={isPasswordLoading}
                  disabled={
                    !passwordForm.formState.isDirty ||
                    !passwordForm.formState.isValid ||
                    Object.keys(passwordForm.formState.errors).length > 0
                  }
                >
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
                <FkButton
                  type="submit"
                  isLoading={isEmailLoading}
                  disabled={
                    !emailForm.formState.isDirty ||
                    !emailForm.formState.isValid ||
                    Object.keys(emailForm.formState.errors).length > 0
                  }
                >
                  Změnit email
                </FkButton>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <div className="mt-12 border-t pt-8">
        <h3 className="text-xl font-semibold mb-4 text-destructive">
          Smazání účtu
        </h3>
        <p className="mb-6 text-muted-foreground">
          Smazání účtu je nevratná akce. Všechna vaše data budou trvale
          odstraněna.
        </p>

        {user?.passwordHash ? (
          <Form {...deleteAccountPasswordForm}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (deleteAccountPasswordForm.formState.isValid) {
                  setIsDeleteDialogOpen(true)
                } else {
                  deleteAccountPasswordForm.trigger()
                }
              }}
              className="space-y-6 max-w-md"
            >
              <FormField
                control={deleteAccountPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zadejte heslo pro potvrzení</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FkButton
                  type="submit"
                  isLoading={deleteAccountMutation.isLoading}
                  variant="destructive"
                  disabled={
                    !deleteAccountPasswordForm.formState.isDirty ||
                    !deleteAccountPasswordForm.formState.isValid ||
                    Object.keys(deleteAccountPasswordForm.formState.errors)
                      .length > 0
                  }
                >
                  Smazat účet
                </FkButton>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...deleteAccountConfirmForm}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (deleteAccountConfirmForm.formState.isValid) {
                  setIsDeleteDialogOpen(true)
                } else {
                  deleteAccountConfirmForm.trigger()
                }
              }}
              className="space-y-6 max-w-md"
            >
              <FormField
                control={deleteAccountConfirmForm.control}
                name="confirmText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pro potvrzení napište "ano"</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FkButton
                  type="submit"
                  isLoading={deleteAccountMutation.isLoading}
                  variant="destructive"
                  disabled={
                    !deleteAccountConfirmForm.formState.isDirty ||
                    !deleteAccountConfirmForm.formState.isValid ||
                    Object.keys(deleteAccountConfirmForm.formState.errors)
                      .length > 0
                  }
                >
                  Smazat účet
                </FkButton>
              </div>
            </form>
          </Form>
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opravdu chcete smazat svůj účet?</DialogTitle>
              <DialogDescription>
                Tato akce je nevratná. Všechna vaše data budou trvale odstraněna
                a nebude možné je obnovit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                onClick={() => {
                  if (user?.passwordHash) {
                    deleteAccountPasswordForm.handleSubmit(
                      onDeleteAccountPasswordSubmit
                    )()
                  } else {
                    deleteAccountConfirmForm.handleSubmit(
                      onDeleteAccountConfirmSubmit
                    )()
                  }
                }}
                variant="destructive"
              >
                Ano, smazat účet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
