CREATE TABLE `site_settings` (
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending_payment','payment_submitted','confirmed','delivered','cancelled') NOT NULL DEFAULT 'pending_payment';