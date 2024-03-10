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
import { SpinnerContainer } from '@/components/SpinnerContainer'

export const fieldConfigForContactForm = {
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
		label: "Email"
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
}


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
								fieldConfig={fieldConfigForContactForm}
							>


									<DialogFooter>
									<Button type="submit">Přidat</Button>
        					</DialogFooter>

							</AutoForm>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
			<SpinnerContainer loading={contactsQuery.isLoading}>
				<Table>
					{(contactsQuery.data?.length ?? 0) > 1 && <TableCaption>Celkem {contactsQuery.data?.length} kontakty</TableCaption>}
					<TableHeader>
						<TableRow>
							<TableHead>Jméno</TableHead>
							<TableHead>Adresa</TableHead>
							<TableHead >Email</TableHead>
							<TableHead>IČO</TableHead>
							<TableHead>DIČ</TableHead>
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
								<TableCell>
									{contact.registration_no}
								</TableCell>
								<TableCell className="text-right">
									{contact.vat_no}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</SpinnerContainer>
		</div>
	)
}
