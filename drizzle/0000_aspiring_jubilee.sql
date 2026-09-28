CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checkins` (
	`person_id` text PRIMARY KEY NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`starts` integer NOT NULL,
	`ends` integer NOT NULL,
	`expires` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`message` text NOT NULL,
	`media_key` text,
	`media_type` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_owner_unique` ON `events` (`owner`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`token_hash` text NOT NULL,
	`welcome_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_token_hash_unique` ON `people` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_welcome_hash_unique` ON `people` (`welcome_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_people_event_code` ON `people` (`event_id`,`code`);