CREATE TABLE `room_directory` (
	`code` text PRIMARY KEY NOT NULL,
	`backend_url` text NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
