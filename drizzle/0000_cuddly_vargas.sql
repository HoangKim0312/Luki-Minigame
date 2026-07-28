CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`requirement` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenge_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`answer` text NOT NULL,
	`normalized_answer` text NOT NULL,
	`locale` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answers_challenge_idx` ON `challenge_answers` (`challenge_id`);--> statement-breakpoint
CREATE TABLE `challenge_hints` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL,
	`score_cost` integer DEFAULT 250 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hints_challenge_position_unique` ON `challenge_hints` (`challenge_id`,`position`);--> statement-breakpoint
CREATE TABLE `challenge_options` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`label` text NOT NULL,
	`statement_correct` integer,
	`explanation` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `options_challenge_idx` ON `challenge_options` (`challenge_id`);--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text,
	`media_asset_id` text,
	`game_mode` text NOT NULL,
	`prompt` text NOT NULL,
	`answer_type` text DEFAULT 'text' NOT NULL,
	`correct_answer` text NOT NULL,
	`base_score` integer DEFAULT 1000 NOT NULL,
	`reward_config` text DEFAULT '{"fragments":3}' NOT NULL,
	`visual_mode` text,
	`max_replays` integer DEFAULT 1 NOT NULL,
	`time_limit_seconds` integer DEFAULT 45 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `media_worlds`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `challenges_world_idx` ON `challenges` (`world_id`);--> statement-breakpoint
CREATE INDEX `challenges_media_idx` ON `challenges` (`media_asset_id`);--> statement-breakpoint
CREATE TABLE `collectible_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`collectible_id` text NOT NULL,
	`name` text NOT NULL,
	`remote_image_url` text,
	`unlock_requirement` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collectible_id`) REFERENCES `collectibles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `variant_collectible_idx` ON `collectible_variants` (`collectible_id`);--> statement-breakpoint
CREATE TABLE `collectibles` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`remote_image_url` text,
	`source` text,
	`source_id` text,
	`rarity` text DEFAULT 'common' NOT NULL,
	`fragment_requirement` integer DEFAULT 3 NOT NULL,
	`unlock_requirement` text DEFAULT '{"type":"fragment"}' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `media_worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collectibles_world_idx` ON `collectibles` (`world_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `collectibles_world_slug_unique` ON `collectibles` (`world_id`,`slug`);--> statement-breakpoint
CREATE TABLE `collection_set_items` (
	`collection_set_id` text NOT NULL,
	`collectible_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`collection_set_id`, `collectible_id`),
	FOREIGN KEY (`collection_set_id`) REFERENCES `collection_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collectible_id`) REFERENCES `collectibles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `set_items_set_idx` ON `collection_set_items` (`collection_set_id`);--> statement-breakpoint
CREATE TABLE `collection_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`cover_image_url` text,
	`completion_reward` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `media_worlds`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_sets_slug_unique` ON `collection_sets` (`slug`);--> statement-breakpoint
CREATE INDEX `collection_sets_world_idx` ON `collection_sets` (`world_id`);--> statement-breakpoint
CREATE TABLE `daily_challenge_items` (
	`daily_challenge_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`daily_challenge_id`, `challenge_id`),
	FOREIGN KEY (`daily_challenge_id`) REFERENCES `daily_challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_date` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`reward_config` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_date_unique` ON `daily_challenges` (`challenge_date`);--> statement-breakpoint
CREATE TABLE `daily_results` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`reward_claimed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`daily_challenge_id`) REFERENCES `daily_challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_result_user_unique` ON `daily_results` (`daily_challenge_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `game_session_hints` (
	`game_session_id` text NOT NULL,
	`hint_id` text NOT NULL,
	`opened_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`game_session_id`, `hint_id`),
	FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hint_id`) REFERENCES `challenge_hints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`answer_submitted_at` text,
	`hint_count` integer DEFAULT 0 NOT NULL,
	`replay_count` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`correct` integer,
	`reward_claimed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `game_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_challenge_idx` ON `game_sessions` (`challenge_id`);--> statement-breakpoint
CREATE TABLE `leaderboard_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_type` text NOT NULL,
	`period_key` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_user_period_unique` ON `leaderboard_entries` (`user_id`,`period_type`,`period_key`);--> statement-breakpoint
CREATE INDEX `leaderboard_score_idx` ON `leaderboard_entries` (`period_type`,`period_key`,`score`);--> statement-breakpoint
CREATE TABLE `media_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`alias` text NOT NULL,
	`locale` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `media_worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_alias_world_idx` ON `media_aliases` (`world_id`);--> statement-breakpoint
CREATE TABLE `media_asset_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`media_asset_id` text NOT NULL,
	`reporter_email` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`evidence_url` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_media_idx` ON `media_asset_reports` (`media_asset_id`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`source_type` text NOT NULL,
	`provider` text NOT NULL,
	`source_url` text,
	`storage_key` text,
	`playback_url` text,
	`embed_url` text,
	`thumbnail_url` text,
	`title` text NOT NULL,
	`artist` text,
	`composer` text,
	`anime_name` text,
	`game_name` text,
	`media_category` text NOT NULL,
	`preview_start_seconds` integer DEFAULT 0 NOT NULL,
	`preview_duration_seconds` integer DEFAULT 30 NOT NULL,
	`full_duration_seconds` integer,
	`can_preview` integer DEFAULT true NOT NULL,
	`can_play_full_after_reveal` integer DEFAULT false NOT NULL,
	`requires_external_full_playback` integer DEFAULT true NOT NULL,
	`requires_visible_player` integer DEFAULT false NOT NULL,
	`max_preview_seconds` integer DEFAULT 30,
	`license_type` text NOT NULL,
	`license_note` text NOT NULL,
	`copyright_owner` text,
	`attribution_text` text NOT NULL,
	`official_source_url` text NOT NULL,
	`uploaded_by` text,
	`approved_by` text,
	`approval_status` text DEFAULT 'needs_review' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_assets_status_idx` ON `media_assets` (`status`);--> statement-breakpoint
CREATE INDEX `media_assets_provider_idx` ON `media_assets` (`provider`);--> statement-breakpoint
CREATE INDEX `media_assets_type_idx` ON `media_assets` (`media_type`);--> statement-breakpoint
CREATE INDEX `media_assets_approval_idx` ON `media_assets` (`approval_status`);--> statement-breakpoint
CREATE TABLE `media_playback_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`game_session_id` text NOT NULL,
	`media_asset_id` text NOT NULL,
	`media_started_at` text,
	`replay_count` integer DEFAULT 0 NOT NULL,
	`revealed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playback_game_session_unique` ON `media_playback_sessions` (`game_session_id`);--> statement-breakpoint
CREATE TABLE `media_provider_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_config_unique` ON `media_provider_configs` (`provider`);--> statement-breakpoint
CREATE TABLE `media_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`adapter` text NOT NULL,
	`attribution` text,
	`terms_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_sources_adapter_unique` ON `media_sources` (`adapter`);--> statement-breakpoint
CREATE TABLE `media_worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`alternative_titles` text DEFAULT '[]' NOT NULL,
	`cover_image_url` text,
	`banner_image_url` text,
	`description` text,
	`genres` text DEFAULT '[]' NOT NULL,
	`release_year` integer,
	`attribution` text,
	`license_note` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worlds_source_id_unique` ON `media_worlds` (`source`,`source_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `worlds_slug_unique` ON `media_worlds` (`slug`);--> statement-breakpoint
CREATE INDEX `worlds_created_idx` ON `media_worlds` (`created_at`);--> statement-breakpoint
CREATE TABLE `titles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `achievement_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_collectibles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`collectible_id` text NOT NULL,
	`variant_id` text,
	`unlocked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collectible_id`) REFERENCES `collectibles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `collectible_variants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_collectible_unique` ON `user_collectibles` (`user_id`,`collectible_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `user_collectibles_user_idx` ON `user_collectibles` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_fragments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`world_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`world_id`) REFERENCES `media_worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fragments_user_world_unique` ON `user_fragments` (`user_id`,`world_id`);--> statement-breakpoint
CREATE INDEX `fragments_user_idx` ON `user_fragments` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	`selected_badge_id` text,
	`selected_title_id` text,
	`background_url` text,
	`streak` integer DEFAULT 0 NOT NULL,
	`archive_score` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `user_profiles` (`username`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);