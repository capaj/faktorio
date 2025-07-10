ALTER TABLE `users` ADD `picture_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);