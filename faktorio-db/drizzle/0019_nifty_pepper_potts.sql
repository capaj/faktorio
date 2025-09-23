CREATE TABLE `user_bank_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text,
	`bank_account` text,
	`iban` text,
	`swift_bic` text,
	`qrcode_decoded` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `user_bank_account` (
	`id`,
	`user_id`,
	`label`,
	`bank_account`,
	`iban`,
	`swift_bic`,
	`qrcode_decoded`,
	`order`
)
SELECT
	printf('uba_%s', lower(hex(randomblob(8)))),
	uid.`user_id`,
	NULL,
	NULLIF(TRIM(uid.`bank_account`), ''),
	NULLIF(TRIM(uid.`iban`), ''),
	NULLIF(TRIM(uid.`swift_bic`), ''),
	NULL,
	0
FROM `user_invoicing_detail` uid
WHERE (
	uid.`bank_account` IS NOT NULL AND TRIM(uid.`bank_account`) <> ''
	) OR (
	uid.`iban` IS NOT NULL AND TRIM(uid.`iban`) <> ''
	) OR (
	uid.`swift_bic` IS NOT NULL AND TRIM(uid.`swift_bic`) <> ''
	)
	AND EXISTS (
		SELECT 1
		FROM `users` u
		WHERE u.`id` = uid.`user_id`
	);
--> statement-breakpoint
CREATE INDEX `user_bank_account_user_idx` ON `user_bank_account` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice_item` (
	`id` integer PRIMARY KEY NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text,
	`quantity` real,
	`unit_price` real,
	`unit` text,
	`vat_rate` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invoice_item`(
	`id`,
	`order`,
	`invoice_id`,
	`description`,
	`quantity`,
	`unit_price`,
	`unit`,
	`vat_rate`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	ROW_NUMBER() OVER (
		PARTITION BY `invoice_id`
		ORDER BY COALESCE(`order`, 0), `id`
	 ) - 1 AS `order`,
	`invoice_id`,
	`description`,
	`quantity`,
	`unit_price`,
	`unit`,
	`vat_rate`,
	`created_at`,
	`updated_at`
FROM `invoice_item`;--> statement-breakpoint
DROP TABLE `invoice_item`;--> statement-breakpoint
ALTER TABLE `__new_invoice_item` RENAME TO `invoice_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoice_idx` ON `invoice_item` (`invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_item_invoice_id_order_unique` ON `invoice_item` (`invoice_id`,`order`);--> statement-breakpoint
ALTER TABLE `user_invoicing_detail` ADD `default_bank_account_id` text REFERENCES user_bank_account(id);--> statement-breakpoint
ALTER TABLE `user_invoicing_detail` DROP COLUMN `bank_account`;
--> statement-breakpoint
UPDATE `user_invoicing_detail`
SET `default_bank_account_id` = (
	SELECT `id`
	FROM `user_bank_account` uba
	WHERE uba.`user_id` = `user_invoicing_detail`.`user_id`
	ORDER BY uba.`order`, uba.`created_at`
	LIMIT 1
)
WHERE EXISTS (
	SELECT 1
	FROM `user_bank_account` uba
	WHERE uba.`user_id` = `user_invoicing_detail`.`user_id`
);
