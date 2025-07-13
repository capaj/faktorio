UPDATE invoice SET `language` = 'cs' WHERE `language` IS NULL;--> statement-breakpoint
UPDATE invoice SET `your_vat_no` = '' WHERE `your_vat_no` IS NULL;--> statement-breakpoint
UPDATE user_invoicing_detail SET `zip` = '' WHERE `zip` IS NULL;--> statement-breakpoint

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`proforma` integer,
	`partial_proforma` integer,
	`number` text NOT NULL,
	`variable_symbol` text,
	`your_name` text NOT NULL,
	`your_street` text NOT NULL,
	`your_street2` text,
	`your_city` text NOT NULL,
	`your_zip` text NOT NULL,
	`your_country` text NOT NULL,
	`your_registration_no` text NOT NULL,
	`your_vat_no` text NOT NULL,
	`client_name` text NOT NULL,
	`client_street` text NOT NULL,
	`client_street2` text,
	`client_city` text NOT NULL,
	`client_zip` text,
	`client_country` text,
	`client_registration_no` text,
	`client_vat_no` text,
	`subject_id` integer,
	`generator_id` integer,
	`related_id` integer,
	`token` text,
	`status` text,
	`order_number` text,
	`issued_on` text NOT NULL,
	`taxable_fulfillment_due` text NOT NULL,
	`due_in_days` integer NOT NULL,
	`due_on` text NOT NULL,
	`sent_at` text,
	`paid_on` text,
	`reminder_sent_at` text,
	`cancelled_at` text,
	`bank_account` text,
	`iban` text,
	`swift_bic` text,
	`payment_method` text NOT NULL,
	`currency` text NOT NULL,
	`exchange_rate` real DEFAULT 1 NOT NULL,
	`language` text DEFAULT 'cs' NOT NULL,
	`transferred_tax_liability` integer,
	`supply_code` text,
	`subtotal` real,
	`total` real NOT NULL,
	`native_subtotal` real NOT NULL,
	`native_total` real,
	`remaining_amount` real,
	`remaining_native_amount` real,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`footer_note` text,
	`tags` text,
	`vat_base_21` real,
	`vat_21` real,
	`vat_base_15` real,
	`vat_15` real,
	`vat_base_12` real,
	`vat_12` real,
	`vat_base_10` real,
	`vat_10` real,
	`vat_base_0` real,
	`private_note` text,
	`correction` integer,
	`correction_id` integer,
	`client_email` text,
	`client_phone` text,
	`custom_id` text,
	`oss` integer,
	`tax_document` integer,
	`payment_method_human` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`published_at` text,
	`client_contact_id` text NOT NULL,
	FOREIGN KEY (`client_contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoice`("id", "user_id", "proforma", "partial_proforma", "number", "variable_symbol", "your_name", "your_street", "your_street2", "your_city", "your_zip", "your_country", "your_registration_no", "your_vat_no", "client_name", "client_street", "client_street2", "client_city", "client_zip", "client_country", "client_registration_no", "client_vat_no", "subject_id", "generator_id", "related_id", "token", "status", "order_number", "issued_on", "taxable_fulfillment_due", "due_in_days", "due_on", "sent_at", "paid_on", "reminder_sent_at", "cancelled_at", "bank_account", "iban", "swift_bic", "payment_method", "currency", "exchange_rate", "language", "transferred_tax_liability", "supply_code", "subtotal", "total", "native_subtotal", "native_total", "remaining_amount", "remaining_native_amount", "paid_amount", "note", "footer_note", "tags", "vat_base_21", "vat_21", "vat_base_15", "vat_15", "vat_base_12", "vat_12", "vat_base_10", "vat_10", "vat_base_0", "private_note", "correction", "correction_id", "client_email", "client_phone", "custom_id", "oss", "tax_document", "payment_method_human", "created_at", "updated_at", "published_at", "client_contact_id") SELECT "id", "user_id", "proforma", "partial_proforma", "number", "variable_symbol", "your_name", "your_street", "your_street2", "your_city", "your_zip", "your_country", "your_registration_no", "your_vat_no", "client_name", "client_street", "client_street2", "client_city", "client_zip", "client_country", "client_registration_no", "client_vat_no", "subject_id", "generator_id", "related_id", "token", "status", "order_number", "issued_on", "taxable_fulfillment_due", "due_in_days", "due_on", "sent_at", "paid_on", "reminder_sent_at", "cancelled_at", "bank_account", "iban", "swift_bic", "payment_method", "currency", "exchange_rate", "language", "transferred_tax_liability", "supply_code", "subtotal", "total", "native_subtotal", "native_total", "remaining_amount", "remaining_native_amount", "paid_amount", "note", "footer_note", "tags", "vat_base_21", "vat_21", "vat_base_15", "vat_15", "vat_base_12", "vat_12", "vat_base_10", "vat_10", "vat_base_0", "private_note", "correction", "correction_id", "client_email", "client_phone", "custom_id", "oss", "tax_document", "payment_method_human", "created_at", "updated_at", "published_at", "client_contact_id" FROM `invoice`;--> statement-breakpoint
DROP TABLE `invoice`;--> statement-breakpoint
ALTER TABLE `__new_invoice` RENAME TO `invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoices_user_idx` ON `invoice` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoices_client_contact_id_idx` ON `invoice` (`client_contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_user_id_number_unique` ON `invoice` (`user_id`,`number`);--> statement-breakpoint
CREATE TABLE `__new_user_invoicing_detail` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`street` text NOT NULL,
	`street2` text,
	`city` text NOT NULL,
	`zip` text NOT NULL,
	`country` text NOT NULL,
	`main_email` text,
	`bank_account` text,
	`iban` text,
	`swift_bic` text,
	`vat_no` text,
	`registration_no` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`phone_number` text,
	`web_url` text
);
--> statement-breakpoint
INSERT INTO `__new_user_invoicing_detail`("user_id", "name", "street", "street2", "city", "zip", "country", "main_email", "bank_account", "iban", "swift_bic", "vat_no", "registration_no", "created_at", "updated_at", "phone_number", "web_url") SELECT "user_id", "name", "street", "street2", "city", "zip", "country", "main_email", "bank_account", "iban", "swift_bic", "vat_no", "registration_no", "created_at", "updated_at", "phone_number", "web_url" FROM `user_invoicing_detail`;--> statement-breakpoint
DROP TABLE `user_invoicing_detail`;--> statement-breakpoint
ALTER TABLE `__new_user_invoicing_detail` RENAME TO `user_invoicing_detail`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_invoicing_detail_user_id_unique` ON `user_invoicing_detail` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_invoicing_details_user_idx` ON `user_invoicing_detail` (`user_id`);