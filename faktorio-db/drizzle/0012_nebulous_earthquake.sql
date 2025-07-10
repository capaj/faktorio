CREATE TABLE `push_subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscription` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscription_endpoint_unique` ON `push_subscription` (`endpoint`);