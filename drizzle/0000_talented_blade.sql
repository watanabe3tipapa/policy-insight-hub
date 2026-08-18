CREATE TABLE `collection_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`requestUrl` text NOT NULL,
	`requestMode` text DEFAULT 'simple' NOT NULL,
	`instruction` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`resultSummary` text,
	`resultUrl` text,
	`errorMessage` text,
	`createdByUserId` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collection_runs_status_idx` ON `collection_runs` (`status`);--> statement-breakpoint
CREATE INDEX `collection_runs_created_at_idx` ON `collection_runs` (`createdAt`);--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`policyArea` text NOT NULL,
	`owner` text NOT NULL,
	`updateFrequency` text NOT NULL,
	`sourceUrl` text,
	`description` text,
	`lastUpdatedAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `data_sources_policy_area_idx` ON `data_sources` (`policyArea`);--> statement-breakpoint
CREATE TABLE `indicator_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indicatorId` integer NOT NULL,
	`observedAt` integer NOT NULL,
	`value` real NOT NULL,
	`note` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `observations_indicator_date_idx` ON `indicator_observations` (`indicatorId`,`observedAt`);--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`policyArea` text NOT NULL,
	`definition` text NOT NULL,
	`calculation` text,
	`unit` text NOT NULL,
	`targetValue` real,
	`targetDirection` text DEFAULT 'increase' NOT NULL,
	`dataSourceId` integer,
	`lastUpdatedAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`dataSourceId`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `indicators_policy_area_idx` ON `indicators` (`policyArea`);--> statement-breakpoint
CREATE INDEX `indicators_data_source_idx` ON `indicators` (`dataSourceId`);--> statement-breakpoint
CREATE TABLE `kitesurf_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`workerUrl` text,
	`status` text DEFAULT 'not_configured' NOT NULL,
	`lastVerifiedAt` integer,
	`autoRefreshEnabled` integer DEFAULT 1 NOT NULL,
	`staleAfterHours` integer DEFAULT 24 NOT NULL,
	`lastStartupCheckAt` integer,
	`lastStartupOutcome` text DEFAULT 'idle' NOT NULL,
	`lastStartupMessage` text,
	`lastStartupRefreshAt` integer,
	`startupRefreshLeaseUntil` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kitesurf_configs_provider_unique` ON `kitesurf_configs` (`provider`);--> statement-breakpoint
CREATE TABLE `policy_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policyId` integer NOT NULL,
	`socialContext` text,
	`equityConsiderations` text,
	`institutionalContext` text,
	`implementationCapacity` text,
	`riskFactors` text,
	`transferabilityNotes` text,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`policyId`) REFERENCES `policy_essences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_contexts_policyId_unique` ON `policy_contexts` (`policyId`);--> statement-breakpoint
CREATE TABLE `policy_essences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceId` integer NOT NULL,
	`sourceCandidateId` integer,
	`title` text NOT NULL,
	`country` text NOT NULL,
	`region` text NOT NULL,
	`policyDomain` text NOT NULL,
	`policyObjective` text NOT NULL,
	`policySummary` text NOT NULL,
	`targetPopulation` text,
	`implementationDesign` text,
	`evidenceType` text DEFAULT 'unknown' NOT NULL,
	`evaluationMethod` text,
	`resultSummary` text,
	`outcomeInterpretation` text,
	`status` text DEFAULT 'candidate' NOT NULL,
	`publishedAt` integer,
	`collectedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `policy_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sourceCandidateId`) REFERENCES `source_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `policy_essences_region_idx` ON `policy_essences` (`region`);--> statement-breakpoint
CREATE INDEX `policy_essences_domain_idx` ON `policy_essences` (`policyDomain`);--> statement-breakpoint
CREATE INDEX `policy_essences_status_idx` ON `policy_essences` (`status`);--> statement-breakpoint
CREATE TABLE `policy_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policyId` integer NOT NULL,
	`evidenceTransparency` text DEFAULT 'medium' NOT NULL,
	`designCredibility` text DEFAULT 'medium' NOT NULL,
	`contextFit` text DEFAULT 'medium' NOT NULL,
	`equityImpact` text DEFAULT 'unclear' NOT NULL,
	`transferability` text DEFAULT 'medium' NOT NULL,
	`limitations` text,
	`reviewerNote` text,
	`reviewedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`policyId`) REFERENCES `policy_essences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_reviews_policyId_unique` ON `policy_reviews` (`policyId`);--> statement-breakpoint
CREATE TABLE `policy_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`sourceType` text NOT NULL,
	`reliabilityTier` text NOT NULL,
	`sourceUrl` text NOT NULL,
	`countryOrRegion` text,
	`language` text,
	`verificationStatus` text DEFAULT 'pending' NOT NULL,
	`publishedAt` integer,
	`retrievedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `policy_sources_organization_idx` ON `policy_sources` (`organization`);--> statement-breakpoint
CREATE INDEX `policy_sources_verification_idx` ON `policy_sources` (`verificationStatus`);--> statement-breakpoint
CREATE TABLE `review_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reviewId` integer NOT NULL,
	`actionItem` text NOT NULL,
	`assignee` text NOT NULL,
	`dueAt` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`result` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_actions_review_idx` ON `review_actions` (`reviewId`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policyArea` text NOT NULL,
	`heldAt` integer NOT NULL,
	`agenda` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_policy_area_idx` ON `reviews` (`policyArea`);--> statement-breakpoint
CREATE TABLE `source_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collectionRunId` integer,
	`name` text NOT NULL,
	`candidateUrl` text,
	`description` text,
	`suggestedPolicyArea` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`reviewedAt` integer,
	FOREIGN KEY (`collectionRunId`) REFERENCES `collection_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `source_candidates_run_idx` ON `source_candidates` (`collectionRunId`);--> statement-breakpoint
CREATE INDEX `source_candidates_status_idx` ON `source_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`lastSignedIn` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);