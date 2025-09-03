CREATE TABLE `invoice_share_event` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`event_type` text,
	`ip_address` text,
	`country` text,
	`user_agent` text,
	`referer` text,
	`path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`share_id`) REFERENCES `invoice_share`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_share_event_share_idx` ON `invoice_share_event` (`share_id`);--> statement-breakpoint
CREATE INDEX `invoice_share_event_type_idx` ON `invoice_share_event` (`event_type`);--> statement-breakpoint
CREATE TABLE `invoice_share` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`disabled_at` text,
	`last_accessed_at` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_share_invoice_idx` ON `invoice_share` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_share_user_idx` ON `invoice_share` (`user_id`);