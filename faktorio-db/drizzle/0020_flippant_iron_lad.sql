CREATE TABLE `invoice_template` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_template_user_idx` ON `invoice_template` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_template_user_id_name_unique` ON `invoice_template` (`user_id`,`name`);