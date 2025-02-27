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

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const ManageLoginDetails = () => {
  const [isLoading, setIsLoading] = useState(false)
  const changePasswordMutation = trpcClient.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Heslo bylo úspěšně změněno')
      form.reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Změna hesla se nezdařila')
    }
  })

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setIsLoading(true)
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Správa přihlašovacích údajů</h2>

      <div className="max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              <FkButton type="submit" isLoading={isLoading}>
                Změnit heslo
              </FkButton>
            </div>
          </form>
        </Form>
      </div>
    </>
  )
}
