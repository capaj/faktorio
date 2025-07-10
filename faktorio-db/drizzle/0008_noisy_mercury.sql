ALTER TABLE `received_invoice` ADD `vat_base_12` real;--> statement-breakpoint
ALTER TABLE `received_invoice` ADD `vat_12` real;--> statement-breakpoint
ALTER TABLE `received_invoice` DROP COLUMN `vat_base_15`;--> statement-breakpoint
ALTER TABLE `received_invoice` DROP COLUMN `vat_15`;--> statement-breakpoint
ALTER TABLE `received_invoice` DROP COLUMN `vat_base_10`;--> statement-breakpoint
ALTER TABLE `received_invoice` DROP COLUMN `vat_10`;