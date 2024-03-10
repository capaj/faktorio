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
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Link } from 'wouter'

const invoices = [
	{
		id: 1,
		invoice: 'INV001',
		paymentStatus: 'Paid',
		totalAmount: '$250.00',
		paymentMethod: 'Credit Card'
	},
	{
		invoice: 'INV002',
		paymentStatus: 'Pending',
		totalAmount: '$150.00',
		paymentMethod: 'PayPal'
	},
	{
		invoice: 'INV003',
		paymentStatus: 'Unpaid',
		totalAmount: '$350.00',
		paymentMethod: 'Bank Transfer'
	},
	{
		invoice: 'INV004',
		paymentStatus: 'Paid',
		totalAmount: '$450.00',
		paymentMethod: 'Credit Card'
	},
	{
		invoice: 'INV005',
		paymentStatus: 'Paid',
		totalAmount: '$550.00',
		paymentMethod: 'PayPal'
	},
	{
		invoice: 'INV006',
		paymentStatus: 'Pending',
		totalAmount: '$200.00',
		paymentMethod: 'Bank Transfer'
	},
	{
		invoice: 'INV007',
		paymentStatus: 'Unpaid',
		totalAmount: '$300.00',
		paymentMethod: 'Credit Card'
	}
]

export function InvoiceList() {
	const q = trpcClient.invoices.all.useQuery()

	return (
		<Table>
			<TableCaption>Víc jich není.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]"></TableHead>
					<TableHead>Status</TableHead>
					<TableHead></TableHead>
					<TableHead className="text-right">Celkem</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className="font-medium">
							<Link href={`/invoices/${invoice.id}`}>{invoice.invoice}</Link>
						</TableCell>

						<TableCell>{invoice.paymentStatus}</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className="text-right">{invoice.totalAmount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
