ALTER TABLE `received_invoice` ADD `line_items_summary` text;--> statement-breakpoint
CREATE INDEX `received_invoices_taxable_supply_date_idx` ON `received_invoice` (`taxable_supply_date`);--> statement-breakpoint
CREATE INDEX `invoices_taxable_fulfillment_due_idx` ON `invoice` (`taxable_fulfillment_due`);