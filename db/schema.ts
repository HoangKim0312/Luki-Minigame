import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role", { enum: ["user", "admin", "creator"] }).notNull().default("user"),
  ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  selectedBadgeId: text("selected_badge_id"),
  selectedTitleId: text("selected_title_id"),
  backgroundUrl: text("background_url"),
  streak: integer("streak").notNull().default(0),
  archiveScore: integer("archive_score").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("profiles_user_unique").on(table.userId), uniqueIndex("profiles_username_unique").on(table.username)]);

export const mediaSources = sqliteTable("media_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  adapter: text("adapter").notNull(),
  attribution: text("attribution"),
  termsUrl: text("terms_url"),
  ...timestamps,
}, (table) => [uniqueIndex("media_sources_adapter_unique").on(table.adapter)]);

export const mediaWorlds = sqliteTable("media_worlds", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  sourceId: text("source_id").notNull(),
  type: text("type", { enum: ["anime", "game", "franchise"] }).notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  alternativeTitles: text("alternative_titles", { mode: "json" }).$type<string[]>().notNull().default([]),
  coverImageUrl: text("cover_image_url"),
  bannerImageUrl: text("banner_image_url"),
  description: text("description"),
  genres: text("genres", { mode: "json" }).$type<string[]>().notNull().default([]),
  releaseYear: integer("release_year"),
  attribution: text("attribution"),
  licenseNote: text("license_note"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  status: text("status", { enum: ["draft", "published", "archived", "disabled"] }).notNull().default("draft"),
  ...timestamps,
}, (table) => [
  uniqueIndex("worlds_source_id_unique").on(table.source, table.sourceId),
  uniqueIndex("worlds_slug_unique").on(table.slug),
  index("worlds_created_idx").on(table.createdAt),
]);

export const mediaAliases = sqliteTable("media_aliases", {
  id: text("id").primaryKey(),
  worldId: text("world_id").notNull().references(() => mediaWorlds.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(),
  locale: text("locale"),
  ...timestamps,
}, (table) => [index("media_alias_world_idx").on(table.worldId)]);

export const collectibles = sqliteTable("collectibles", {
  id: text("id").primaryKey(),
  worldId: text("world_id").notNull().references(() => mediaWorlds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  remoteImageUrl: text("remote_image_url"),
  source: text("source"),
  sourceId: text("source_id"),
  rarity: text("rarity").notNull().default("common"),
  fragmentRequirement: integer("fragment_requirement").notNull().default(3),
  unlockRequirement: text("unlock_requirement", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({ type: "fragment" }),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [index("collectibles_world_idx").on(table.worldId), uniqueIndex("collectibles_world_slug_unique").on(table.worldId, table.slug)]);

export const collectibleVariants = sqliteTable("collectible_variants", {
  id: text("id").primaryKey(),
  collectibleId: text("collectible_id").notNull().references(() => collectibles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  remoteImageUrl: text("remote_image_url"),
  unlockRequirement: text("unlock_requirement", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
}, (table) => [index("variant_collectible_idx").on(table.collectibleId)]);

export const collectionSets = sqliteTable("collection_sets", {
  id: text("id").primaryKey(),
  worldId: text("world_id").references(() => mediaWorlds.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  completionReward: text("completion_reward", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [uniqueIndex("collection_sets_slug_unique").on(table.slug), index("collection_sets_world_idx").on(table.worldId)]);

export const collectionSetItems = sqliteTable("collection_set_items", {
  collectionSetId: text("collection_set_id").notNull().references(() => collectionSets.id, { onDelete: "cascade" }),
  collectibleId: text("collectible_id").notNull().references(() => collectibles.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.collectionSetId, table.collectibleId] }), index("set_items_set_idx").on(table.collectionSetId)]);

export const userFragments = sqliteTable("user_fragments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  worldId: text("world_id").notNull().references(() => mediaWorlds.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("fragments_user_world_unique").on(table.userId, table.worldId), index("fragments_user_idx").on(table.userId)]);

export const userCollectibles = sqliteTable("user_collectibles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  collectibleId: text("collectible_id").notNull().references(() => collectibles.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => collectibleVariants.id, { onDelete: "set null" }),
  unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ...timestamps,
}, (table) => [uniqueIndex("user_collectible_unique").on(table.userId, table.collectibleId, table.variantId), index("user_collectibles_user_idx").on(table.userId)]);

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  mediaType: text("media_type", { enum: ["audio", "video"] }).notNull(),
  sourceType: text("source_type").notNull(),
  provider: text("provider").notNull(),
  sourceUrl: text("source_url"),
  storageKey: text("storage_key"),
  playbackUrl: text("playback_url"),
  embedUrl: text("embed_url"),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title").notNull(),
  artist: text("artist"),
  composer: text("composer"),
  animeName: text("anime_name"),
  gameName: text("game_name"),
  mediaCategory: text("media_category").notNull(),
  previewStartSeconds: integer("preview_start_seconds").notNull().default(0),
  previewDurationSeconds: integer("preview_duration_seconds").notNull().default(30),
  fullDurationSeconds: integer("full_duration_seconds"),
  canPreview: integer("can_preview", { mode: "boolean" }).notNull().default(true),
  canPlayFullAfterReveal: integer("can_play_full_after_reveal", { mode: "boolean" }).notNull().default(false),
  requiresExternalFullPlayback: integer("requires_external_full_playback", { mode: "boolean" }).notNull().default(true),
  requiresVisiblePlayer: integer("requires_visible_player", { mode: "boolean" }).notNull().default(false),
  maxPreviewSeconds: integer("max_preview_seconds").default(30),
  licenseType: text("license_type").notNull(),
  licenseNote: text("license_note").notNull(),
  copyrightOwner: text("copyright_owner"),
  attributionText: text("attribution_text").notNull(),
  officialSourceUrl: text("official_source_url").notNull(),
  uploadedBy: text("uploaded_by"),
  approvedBy: text("approved_by"),
  approvalStatus: text("approval_status").notNull().default("needs_review"),
  status: text("status").notNull().default("draft"),
  ...timestamps,
}, (table) => [
  index("media_assets_status_idx").on(table.status),
  index("media_assets_provider_idx").on(table.provider),
  index("media_assets_type_idx").on(table.mediaType),
  index("media_assets_approval_idx").on(table.approvalStatus),
]);

export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  worldId: text("world_id").references(() => mediaWorlds.id, { onDelete: "set null" }),
  mediaAssetId: text("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  gameMode: text("game_mode").notNull(),
  prompt: text("prompt").notNull(),
  answerType: text("answer_type").notNull().default("text"),
  correctAnswer: text("correct_answer").notNull(),
  baseScore: integer("base_score").notNull().default(1000),
  rewardConfig: text("reward_config", { mode: "json" }).$type<{ fragments: number }>().notNull().default({ fragments: 3 }),
  visualMode: text("visual_mode"),
  maxReplays: integer("max_replays").notNull().default(1),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(45),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [index("challenges_world_idx").on(table.worldId), index("challenges_media_idx").on(table.mediaAssetId)]);

export const challengeHints = sqliteTable("challenge_hints", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: text("content").notNull(),
  position: integer("position").notNull(),
  scoreCost: integer("score_cost").notNull().default(250),
  ...timestamps,
}, (table) => [uniqueIndex("hints_challenge_position_unique").on(table.challengeId, table.position)]);

export const challengeAnswers = sqliteTable("challenge_answers", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  normalizedAnswer: text("normalized_answer").notNull(),
  locale: text("locale"),
  ...timestamps,
}, (table) => [index("answers_challenge_idx").on(table.challengeId)]);

export const challengeOptions = sqliteTable("challenge_options", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  statementCorrect: integer("statement_correct", { mode: "boolean" }),
  explanation: text("explanation"),
  ...timestamps,
}, (table) => [index("options_challenge_idx").on(table.challengeId)]);

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  answerSubmittedAt: text("answer_submitted_at"),
  hintCount: integer("hint_count").notNull().default(0),
  replayCount: integer("replay_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  correct: integer("correct", { mode: "boolean" }),
  rewardClaimedAt: text("reward_claimed_at"),
  ...timestamps,
}, (table) => [index("sessions_user_idx").on(table.userId), index("sessions_challenge_idx").on(table.challengeId)]);

export const gameSessionHints = sqliteTable("game_session_hints", {
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  hintId: text("hint_id").notNull().references(() => challengeHints.id, { onDelete: "cascade" }),
  openedAt: text("opened_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.gameSessionId, table.hintId] })]);

export const dailyChallenges = sqliteTable("daily_challenges", {
  id: text("id").primaryKey(),
  challengeDate: text("challenge_date").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  rewardConfig: text("reward_config", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("published"),
  ...timestamps,
}, (table) => [uniqueIndex("daily_date_unique").on(table.challengeDate)]);

export const dailyChallengeItems = sqliteTable("daily_challenge_items", {
  dailyChallengeId: text("daily_challenge_id").notNull().references(() => dailyChallenges.id, { onDelete: "cascade" }),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.dailyChallengeId, table.challengeId] })]);

export const dailyResults = sqliteTable("daily_results", {
  id: text("id").primaryKey(),
  dailyChallengeId: text("daily_challenge_id").notNull().references(() => dailyChallenges.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  completedAt: text("completed_at"),
  rewardClaimedAt: text("reward_claimed_at"),
  ...timestamps,
}, (table) => [uniqueIndex("daily_result_user_unique").on(table.dailyChallengeId, table.userId)]);

export const leaderboardEntries = sqliteTable("leaderboard_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: text("period_type").notNull(),
  periodKey: text("period_key").notNull(),
  score: integer("score").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("leaderboard_user_period_unique").on(table.userId, table.periodType, table.periodKey), index("leaderboard_score_idx").on(table.periodType, table.periodKey, table.score)]);

export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  ...timestamps,
});

export const titles = sqliteTable("titles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  requirement: text("requirement", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const userAchievements = sqliteTable("user_achievements", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: text("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.achievementId] })]);

export const mediaAssetReports = sqliteTable("media_asset_reports", {
  id: text("id").primaryKey(),
  mediaAssetId: text("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  reporterEmail: text("reporter_email").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  evidenceUrl: text("evidence_url"),
  status: text("status").notNull().default("open"),
  ...timestamps,
}, (table) => [index("reports_media_idx").on(table.mediaAssetId)]);

export const mediaPlaybackSessions = sqliteTable("media_playback_sessions", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  mediaAssetId: text("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  mediaStartedAt: text("media_started_at"),
  replayCount: integer("replay_count").notNull().default(0),
  revealedAt: text("revealed_at"),
  ...timestamps,
}, (table) => [uniqueIndex("playback_game_session_unique").on(table.gameSessionId)]);

export const mediaProviderConfigs = sqliteTable("media_provider_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [uniqueIndex("provider_config_unique").on(table.provider)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
}, (table) => [index("audit_created_idx").on(table.createdAt)]);
