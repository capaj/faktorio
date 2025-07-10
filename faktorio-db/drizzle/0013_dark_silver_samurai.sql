CREATE TABLE `system_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_count` integer NOT NULL,
	`invoice_count` integer NOT NULL,
	`calculated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
