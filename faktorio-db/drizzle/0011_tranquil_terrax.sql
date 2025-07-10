PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`full_name` text,
	`street` text,
	`street2` text,
	`city` text,
	`zip` text,
	`country` text,
	`registration_no` text,
	`vat_no` text,
	`bank_account` text,
	`iban` text,
	`web` text,
	`variable_symbol` text,
	`phone_number` text,
	`phone` text,
	`main_email` text,
	`email` text,
	`email_copy` text,
	`private_note` text,
	`type` text,
	`default_invoice_due_in_days` integer,
	`default_invoice_item_unit` text,
	`currency` text DEFAULT 'CZK' NOT NULL,
	`language` text DEFAULT 'cs' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint

UPDATE `contact` SET `currency` = 'CZK', `language` = 'cs' WHERE `currency` IS NULL OR `language` IS NULL;--> statement-breakpoint

INSERT INTO `__new_contact`("id", "user_id", "name", "full_name", "street", "street2", "city", "zip", "country", "registration_no", "vat_no", "bank_account", "iban", "web", "variable_symbol", "phone_number", "phone", "main_email", "email", "email_copy", "private_note", "type", "default_invoice_due_in_days", "default_invoice_item_unit", "currency", "language", "created_at", "updated_at") SELECT "id", "user_id", "name", "full_name", "street", "street2", "city", "zip", "country", "registration_no", "vat_no", "bank_account", "iban", "web", "variable_symbol", "phone_number", "phone", "main_email", "email", "email_copy", "private_note", "type", "default_invoice_due_in_days", "default_invoice_item_unit", "currency", "language", "created_at", "updated_at" FROM `contact`;--> statement-breakpoint
DROP TABLE `contact`;--> statement-breakpoint
ALTER TABLE `__new_contact` RENAME TO `contact`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `contact_user_idx` ON `contact` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_user_id_name_unique` ON `contact` (`user_id`,`name`);