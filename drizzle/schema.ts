import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).defaultNow().notNull(),
});

export const dataSources = sqliteTable(
  "data_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    policyArea: text("policyArea").notNull(),
    owner: text("owner").notNull(),
    updateFrequency: text("updateFrequency", {
      enum: ["daily", "monthly", "quarterly", "annual", "irregular"],
    }).notNull(),
    sourceUrl: text("sourceUrl"),
    description: text("description"),
    lastUpdatedAt: integer("lastUpdatedAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    policyAreaIdx: index("data_sources_policy_area_idx").on(table.policyArea),
  }),
);

export const indicators = sqliteTable(
  "indicators",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    policyArea: text("policyArea").notNull(),
    definition: text("definition").notNull(),
    calculation: text("calculation"),
    unit: text("unit").notNull(),
    targetValue: real("targetValue"),
    targetDirection: text("targetDirection", { enum: ["increase", "decrease", "maintain"] })
      .default("increase")
      .notNull(),
    dataSourceId: integer("dataSourceId").references(() => dataSources.id),
    lastUpdatedAt: integer("lastUpdatedAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    policyAreaIdx: index("indicators_policy_area_idx").on(table.policyArea),
    dataSourceIdx: index("indicators_data_source_idx").on(table.dataSourceId),
  }),
);

export const indicatorObservations = sqliteTable(
  "indicator_observations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    indicatorId: integer("indicatorId")
      .notNull()
      .references(() => indicators.id),
    observedAt: integer("observedAt", { mode: "timestamp" }).notNull(),
    value: real("value").notNull(),
    note: text("note"),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    indicatorDateIdx: index("observations_indicator_date_idx").on(
      table.indicatorId,
      table.observedAt,
    ),
  }),
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    policyArea: text("policyArea").notNull(),
    heldAt: integer("heldAt", { mode: "timestamp" }).notNull(),
    agenda: text("agenda").notNull(),
    summary: text("summary"),
    status: text("status", { enum: ["scheduled", "completed", "closed"] })
      .default("scheduled")
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    policyAreaIdx: index("reviews_policy_area_idx").on(table.policyArea),
  }),
);

export const reviewActions = sqliteTable(
  "review_actions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reviewId: integer("reviewId")
      .notNull()
      .references(() => reviews.id),
    actionItem: text("actionItem").notNull(),
    assignee: text("assignee").notNull(),
    dueAt: integer("dueAt", { mode: "timestamp" }),
    status: text("status", { enum: ["open", "in_progress", "completed"] })
      .default("open")
      .notNull(),
    result: text("result"),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    reviewIdx: index("review_actions_review_idx").on(table.reviewId),
  }),
);

export const kitesurfConfigs = sqliteTable("kitesurf_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider", { enum: ["kitesurf"] }).notNull().unique(),
  workerUrl: text("workerUrl"),
  status: text("status", { enum: ["not_configured", "ready", "error"] })
    .default("not_configured")
    .notNull(),
  lastVerifiedAt: integer("lastVerifiedAt", { mode: "timestamp" }),
  autoRefreshEnabled: integer("autoRefreshEnabled").default(1).notNull(),
  staleAfterHours: integer("staleAfterHours").default(24).notNull(),
  lastStartupCheckAt: integer("lastStartupCheckAt", { mode: "timestamp" }),
  lastStartupOutcome: text("lastStartupOutcome", {
    enum: ["idle", "skipped_fresh", "skipped_unconfigured", "skipped_leased", "refreshing", "succeeded", "failed"],
  })
    .default("idle")
    .notNull(),
  lastStartupMessage: text("lastStartupMessage"),
  lastStartupRefreshAt: integer("lastStartupRefreshAt", { mode: "timestamp" }),
  startupRefreshLeaseUntil: integer("startupRefreshLeaseUntil", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export const collectionRuns = sqliteTable(
  "collection_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provider: text("provider", { enum: ["kitesurf"] }).notNull(),
    requestUrl: text("requestUrl").notNull(),
    requestMode: text("requestMode", { enum: ["simple", "instruction"] })
      .default("simple")
      .notNull(),
    instruction: text("instruction"),
    status: text("status", { enum: ["queued", "running", "succeeded", "failed"] })
      .default("queued")
      .notNull(),
    resultSummary: text("resultSummary"),
    resultUrl: text("resultUrl"),
    errorMessage: text("errorMessage"),
    createdByUserId: integer("createdByUserId").references(() => users.id),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    completedAt: integer("completedAt", { mode: "timestamp" }),
  },
  table => ({
    statusIdx: index("collection_runs_status_idx").on(table.status),
    createdAtIdx: index("collection_runs_created_at_idx").on(table.createdAt),
  }),
);

export const sourceCandidates = sqliteTable(
  "source_candidates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    collectionRunId: integer("collectionRunId").references(() => collectionRuns.id),
    name: text("name").notNull(),
    candidateUrl: text("candidateUrl"),
    description: text("description"),
    suggestedPolicyArea: text("suggestedPolicyArea"),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    reviewedAt: integer("reviewedAt", { mode: "timestamp" }),
  },
  table => ({
    runIdx: index("source_candidates_run_idx").on(table.collectionRunId),
    statusIdx: index("source_candidates_status_idx").on(table.status),
  }),
);

export const policySources = sqliteTable(
  "policy_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    organization: text("organization").notNull(),
    sourceType: text("sourceType", {
      enum: ["international_org", "government", "research", "other"],
    }).notNull(),
    reliabilityTier: text("reliabilityTier", {
      enum: ["primary", "independent_evaluation", "peer_reviewed", "secondary"],
    }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    countryOrRegion: text("countryOrRegion"),
    language: text("language"),
    verificationStatus: text("verificationStatus", {
      enum: ["pending", "verified", "archived"],
    })
      .default("pending")
      .notNull(),
    publishedAt: integer("publishedAt", { mode: "timestamp" }),
    retrievedAt: integer("retrievedAt", { mode: "timestamp" }).defaultNow().notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    organizationIdx: index("policy_sources_organization_idx").on(table.organization),
    verificationIdx: index("policy_sources_verification_idx").on(table.verificationStatus),
  }),
);

export const policyEssences = sqliteTable(
  "policy_essences",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("sourceId")
      .notNull()
      .references(() => policySources.id),
    sourceCandidateId: integer("sourceCandidateId").references(() => sourceCandidates.id),
    title: text("title").notNull(),
    country: text("country").notNull(),
    region: text("region").notNull(),
    policyDomain: text("policyDomain").notNull(),
    policyObjective: text("policyObjective").notNull(),
    policySummary: text("policySummary").notNull(),
    targetPopulation: text("targetPopulation"),
    implementationDesign: text("implementationDesign"),
    evidenceType: text("evidenceType", {
      enum: ["causal", "quasi_experimental", "descriptive", "mixed", "review", "unknown"],
    })
      .default("unknown")
      .notNull(),
    evaluationMethod: text("evaluationMethod"),
    resultSummary: text("resultSummary"),
    outcomeInterpretation: text("outcomeInterpretation"),
    status: text("status", { enum: ["candidate", "reviewed", "published", "archived"] })
      .default("candidate")
      .notNull(),
    publishedAt: integer("publishedAt", { mode: "timestamp" }),
    collectedAt: integer("collectedAt", { mode: "timestamp" }).defaultNow().notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  table => ({
    regionIdx: index("policy_essences_region_idx").on(table.region),
    domainIdx: index("policy_essences_domain_idx").on(table.policyDomain),
    statusIdx: index("policy_essences_status_idx").on(table.status),
  }),
);

export const policyContexts = sqliteTable("policy_contexts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  policyId: integer("policyId")
    .notNull()
    .unique()
    .references(() => policyEssences.id),
  socialContext: text("socialContext"),
  equityConsiderations: text("equityConsiderations"),
  institutionalContext: text("institutionalContext"),
  implementationCapacity: text("implementationCapacity"),
  riskFactors: text("riskFactors"),
  transferabilityNotes: text("transferabilityNotes"),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export const policyReviews = sqliteTable("policy_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  policyId: integer("policyId")
    .notNull()
    .unique()
    .references(() => policyEssences.id),
  evidenceTransparency: text("evidenceTransparency", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  designCredibility: text("designCredibility", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  contextFit: text("contextFit", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  equityImpact: text("equityImpact", { enum: ["risk", "neutral", "positive", "unclear"] }).default("unclear").notNull(),
  transferability: text("transferability", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  limitations: text("limitations"),
  reviewerNote: text("reviewerNote"),
  reviewedAt: integer("reviewedAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DataSource = typeof dataSources.$inferSelect;
export type Indicator = typeof indicators.$inferSelect;
export type IndicatorObservation = typeof indicatorObservations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ReviewAction = typeof reviewActions.$inferSelect;
export type KitesurfConfig = typeof kitesurfConfigs.$inferSelect;
export type CollectionRun = typeof collectionRuns.$inferSelect;
export type SourceCandidate = typeof sourceCandidates.$inferSelect;
export type PolicySource = typeof policySources.$inferSelect;
export type PolicyEssence = typeof policyEssences.$inferSelect;
export type PolicyContext = typeof policyContexts.$inferSelect;
export type PolicyReview = typeof policyReviews.$inferSelect;