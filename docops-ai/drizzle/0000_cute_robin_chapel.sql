CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`file_key` text,
	`hash` text NOT NULL,
	`fields` text NOT NULL,
	`source_text` text NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'review' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`update_token` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
