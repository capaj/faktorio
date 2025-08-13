PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_system_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_count` integer NOT NULL,
	`invoice_count` integer NOT NULL,
	`received_invoice_count` integer DEFAULT 0 NOT NULL,
	`calculated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_system_stats`("id", "user_count", "invoice_count", "received_invoice_count", "calculated_at", "created_at") SELECT "id", "user_count", "invoice_count", "received_invoice_count", "calculated_at", "created_at" FROM `system_stats`;--> statement-breakpoint
DROP TABLE `system_stats`;--> statement-breakpoint
ALTER TABLE `__new_system_stats` RENAME TO `system_stats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;