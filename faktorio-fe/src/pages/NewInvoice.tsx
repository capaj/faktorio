import AutoForm from "@/components/ui/auto-form"
import { invoiceInsertSchema } from '../../../faktorio-api/src/zodDbSchemas'
import { z } from "zod";

const formSchema = invoiceInsertSchema.pick({
	currency: true,
	issued_on: true,
	payment_method: true,
	footer_note: true,
	taxable_fulfillment_due: true
})

export const NewInvoice = () => {
	return (
		<div>
			<h2>New Invoice</h2>
			<AutoForm formSchema={formSchema} ></AutoForm>
		</div>
	)
}
