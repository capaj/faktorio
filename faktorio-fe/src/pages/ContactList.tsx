import AutoForm from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
	TableCaption,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
	Table
} from '@/components/ui/table'
import { trpcClient } from '@/lib/trpcClient'

import { Link } from 'wouter'
import { contactCreateFormSchema } from '../../../faktorio-api/src/routers/contactCreateFormSchema'
import { useState } from 'react'


export const ContactList = () => {
	const contactsQuery = trpcClient.contacts.all.useQuery()
	const create = trpcClient.contacts.create.useMutation()
	const [open, setOpen] = useState(false);
	return (
		<div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger><Button variant={'default'}>Přidat klienta</Button></DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nový kontakt</DialogTitle>
						<DialogDescription>
							<AutoForm formSchema={contactCreateFormSchema}
								onSubmit={async (values) => { 

									await create.mutateAsync(values)
									contactsQuery.refetch()
									setOpen(false)
								}}
								fieldConfig={{
									name: {
										label: "Jméno"
									},
									street: {
										label: 'Ulice'
									},
									street2: {
										label: 'Ulice 2'
									},
									main_email: {
										label: "email"
									},
									registration_no: {
										label: "IČO"
									},
									vat_no: {
										label: "DIČ"
									},
									zip: {
										label: "Poštovní směrovací číslo"
									}
							}}
							>

									
									<DialogFooter>
									<Button type="submit">Přidat</Button>
        					</DialogFooter>

							</AutoForm>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
			<Table>
				<TableCaption>Celkem {contactsQuery.data?.length}.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[100px]"></TableHead>
						<TableHead>Jméno</TableHead>
						<TableHead>Adresa</TableHead>
						<TableHead className="text-right">Email</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{contactsQuery.data?.map((contact) => (
						<TableRow key={contact.id}>
							<TableCell className="font-medium">
								<Link href={`/contacts/${contact.id}`}>{contact.name}</Link>
							</TableCell>

							<TableCell>{contact.street}, {contact.city}</TableCell>
							<TableCell>{contact.main_email}</TableCell>
							<TableCell className="text-right">
								{contact.created_at}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
