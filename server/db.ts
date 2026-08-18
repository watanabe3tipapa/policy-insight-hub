import { and, desc, eq, isNull, like, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  dataSources,
  collectionRuns,
  indicators,
  indicatorObservations,
  InsertUser,
  kitesurfConfigs,
  policyContexts,
  policyEssences,
  policyReviews,
  policySources,
  reviewActions,
  reviews,
  sourceCandidates,
  users,
  type CollectionRun,
  type DataSource,
  type Indicator,
  type IndicatorObservation,
  type KitesurfConfig,
  type PolicyContext,
  type PolicyEssence,
  type PolicyReview,
  type PolicySource,
  type Review,
  type ReviewAction,
  type SourceCandidate,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _binding: unknown = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Injects the Cloudflare D1 binding before any query runs. Called by the
 * Worker entry point with `ctx.env.DB`. When running locally without a
 * binding, `getDb` returns null so callers can degrade gracefully.
 */
export function bindD1Database(binding: unknown) {
  _binding = binding;
  _db = null;
}

export async function getDb() {
  if (!_db && _binding) {
    try {
      _db = drizzle(_binding as never);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: { ...updateSet, updatedAt: new Date() },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listDataSources(search?: string): Promise<DataSource[]> {
  const db = await requireDb();
  const query = search?.trim();
  return db
    .select()
    .from(dataSources)
    .where(
      query
        ? or(
            like(dataSources.name, `%${query}%`),
            like(dataSources.policyArea, `%${query}%`),
            like(dataSources.owner, `%${query}%`),
          )
        : undefined,
    )
    .orderBy(desc(dataSources.updatedAt));
}

export async function createDataSource(values: Omit<typeof dataSources.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const result = await db.insert(dataSources).values(values).returning({ id: dataSources.id });
  return result[0].id;
}

export async function updateDataSource(
  id: number,
  values: Partial<Omit<typeof dataSources.$inferInsert, "id" | "createdAt" | "updatedAt">>,
) {
  const db = await requireDb();
  await db.update(dataSources).set({ ...values, updatedAt: new Date() }).where(eq(dataSources.id, id));
}

export type IndicatorWithSource = Indicator & { dataSourceName: string | null };

export async function listIndicators(search?: string): Promise<IndicatorWithSource[]> {
  const db = await requireDb();
  const query = search?.trim();
  const rows = await db
    .select({ indicator: indicators, dataSourceName: dataSources.name })
    .from(indicators)
    .leftJoin(dataSources, eq(indicators.dataSourceId, dataSources.id))
    .where(
      query
        ? or(
            like(indicators.name, `%${query}%`),
            like(indicators.policyArea, `%${query}%`),
            like(indicators.definition, `%${query}%`),
          )
        : undefined,
    )
    .orderBy(desc(indicators.updatedAt));
  return rows.map(row => ({ ...row.indicator, dataSourceName: row.dataSourceName }));
}

export async function createIndicator(values: Omit<typeof indicators.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const result = await db.insert(indicators).values(values).returning({ id: indicators.id });
  return result[0].id;
}

export async function updateIndicator(
  id: number,
  values: Partial<Omit<typeof indicators.$inferInsert, "id" | "createdAt" | "updatedAt">>,
) {
  const db = await requireDb();
  await db.update(indicators).set({ ...values, updatedAt: new Date() }).where(eq(indicators.id, id));
}

export async function listObservations(indicatorId?: number): Promise<IndicatorObservation[]> {
  const db = await requireDb();
  return db
    .select()
    .from(indicatorObservations)
    .where(indicatorId ? eq(indicatorObservations.indicatorId, indicatorId) : undefined)
    .orderBy(indicatorObservations.observedAt);
}

export async function createObservation(values: Omit<typeof indicatorObservations.$inferInsert, "id" | "createdAt">) {
  const db = await requireDb();
  const result = await db.insert(indicatorObservations).values(values).returning({ id: indicatorObservations.id });
  return result[0].id;
}

export type ReviewWithActions = Review & { actions: ReviewAction[] };

export async function listReviews(): Promise<ReviewWithActions[]> {
  const db = await requireDb();
  const rows = await db
    .select({ review: reviews, action: reviewActions })
    .from(reviews)
    .leftJoin(reviewActions, eq(reviews.id, reviewActions.reviewId))
    .orderBy(desc(reviews.heldAt));
  const grouped = new Map<number, ReviewWithActions>();
  for (const row of rows) {
    const existing = grouped.get(row.review.id) ?? { ...row.review, actions: [] };
    if (row.action) existing.actions.push(row.action);
    grouped.set(row.review.id, existing);
  }
  return Array.from(grouped.values());
}

export async function createReview(values: Omit<typeof reviews.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const result = await db.insert(reviews).values(values).returning({ id: reviews.id });
  return result[0].id;
}

export async function createReviewAction(values: Omit<typeof reviewActions.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const result = await db.insert(reviewActions).values(values).returning({ id: reviewActions.id });
  return result[0].id;
}

export async function updateReviewAction(
  id: number,
  values: Partial<Pick<typeof reviewActions.$inferInsert, "status" | "result" | "assignee" | "dueAt" | "actionItem">>,
) {
  const db = await requireDb();
  await db.update(reviewActions).set({ ...values, updatedAt: new Date() }).where(eq(reviewActions.id, id));
}

export async function updateReview(
  id: number,
  values: Partial<Pick<typeof reviews.$inferInsert, "policyArea" | "heldAt" | "agenda" | "summary" | "status">>,
) {
  const db = await requireDb();
  await db.update(reviews).set({ ...values, updatedAt: new Date() }).where(eq(reviews.id, id));
}

export async function deleteReview(id: number) {
  const db = await requireDb();
  await db.delete(reviewActions).where(eq(reviewActions.reviewId, id));
  await db.delete(reviews).where(eq(reviews.id, id));
}

export async function deleteReviewAction(id: number) {
  const db = await requireDb();
  await db.delete(reviewActions).where(eq(reviewActions.id, id));
}

export async function getKitesurfConfig(): Promise<KitesurfConfig | undefined> {
  const db = await requireDb();
  const result = await db.select().from(kitesurfConfigs).where(eq(kitesurfConfigs.provider, "kitesurf")).limit(1);
  return result[0];
}

export async function saveKitesurfConfig(workerUrl: string | null) {
  const db = await requireDb();
  await db
    .insert(kitesurfConfigs)
    .values({ provider: "kitesurf", workerUrl, status: workerUrl ? "ready" : "not_configured" })
    .onConflictDoUpdate({
      target: kitesurfConfigs.provider,
      set: { workerUrl, status: workerUrl ? "ready" : "not_configured", updatedAt: new Date() },
    });
}

export async function listCollectionRuns(): Promise<CollectionRun[]> {
  const db = await requireDb();
  return db.select().from(collectionRuns).orderBy(desc(collectionRuns.createdAt)).limit(25);
}

export async function getLatestSuccessfulKitesurfRun(): Promise<CollectionRun | undefined> {
  const db = await requireDb();
  const result = await db
    .select()
    .from(collectionRuns)
    .where(and(eq(collectionRuns.provider, "kitesurf"), eq(collectionRuns.status, "succeeded")))
    .orderBy(desc(collectionRuns.completedAt), desc(collectionRuns.createdAt))
    .limit(1);
  return result[0];
}

export async function acquireKitesurfStartupLease(now: Date, leaseUntil: Date): Promise<boolean> {
  const db = await requireDb();
  const result = await db
    .update(kitesurfConfigs)
    .set({ startupRefreshLeaseUntil: leaseUntil, lastStartupCheckAt: now, lastStartupOutcome: "refreshing", lastStartupMessage: "起動時の鮮度検知により更新を開始しました。", updatedAt: new Date() })
    .where(and(eq(kitesurfConfigs.provider, "kitesurf"), or(isNull(kitesurfConfigs.startupRefreshLeaseUntil), lt(kitesurfConfigs.startupRefreshLeaseUntil, now))));
  return Number(result.meta.changes) > 0;
}

export async function recordKitesurfStartupState(
  outcome: "skipped_fresh" | "skipped_unconfigured" | "skipped_leased" | "succeeded" | "failed",
  message: string,
  now: Date,
) {
  const db = await requireDb();
  await db
    .update(kitesurfConfigs)
    .set({
      lastStartupCheckAt: now,
      lastStartupOutcome: outcome,
      lastStartupMessage: message,
      lastStartupRefreshAt: outcome === "succeeded" ? now : undefined,
      status: outcome === "failed" ? "error" : undefined,
      startupRefreshLeaseUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(kitesurfConfigs.provider, "kitesurf"));
}

export async function updateKitesurfRefreshSettings(autoRefreshEnabled: boolean, staleAfterHours: number) {
  const db = await requireDb();
  await db
    .update(kitesurfConfigs)
    .set({ autoRefreshEnabled: autoRefreshEnabled ? 1 : 0, staleAfterHours, updatedAt: new Date() })
    .where(eq(kitesurfConfigs.provider, "kitesurf"));
}

export async function listSourceCandidates(): Promise<SourceCandidate[]> {
  const db = await requireDb();
  return db.select().from(sourceCandidates).orderBy(desc(sourceCandidates.createdAt)).limit(25);
}

export async function createCollectionRun(
  values: Omit<typeof collectionRuns.$inferInsert, "id" | "createdAt" | "completedAt">,
) {
  const db = await requireDb();
  const result = await db.insert(collectionRuns).values(values).returning({ id: collectionRuns.id });
  return result[0].id;
}

export async function updateCollectionRun(
  id: number,
  values: Partial<Pick<typeof collectionRuns.$inferInsert, "status" | "resultSummary" | "resultUrl" | "errorMessage" | "completedAt">>,
) {
  const db = await requireDb();
  await db.update(collectionRuns).set(values).where(eq(collectionRuns.id, id));
}

export async function createSourceCandidate(
  values: Omit<typeof sourceCandidates.$inferInsert, "id" | "createdAt" | "reviewedAt">,
) {
  const db = await requireDb();
  const result = await db.insert(sourceCandidates).values(values).returning({ id: sourceCandidates.id });
  return result[0].id;
}

export async function updateSourceCandidate(
  id: number,
  values: Partial<Pick<typeof sourceCandidates.$inferInsert, "status" | "name" | "candidateUrl" | "description" | "suggestedPolicyArea" | "reviewedAt">>,
) {
  const db = await requireDb();
  await db.update(sourceCandidates).set(values).where(eq(sourceCandidates.id, id));
}

export async function listPolicySources(): Promise<PolicySource[]> {
  const db = await requireDb();
  return db.select().from(policySources).orderBy(desc(policySources.retrievedAt));
}

export async function createPolicySource(
  values: Omit<typeof policySources.$inferInsert, "id" | "createdAt" | "updatedAt" | "retrievedAt">,
) {
  const db = await requireDb();
  const result = await db.insert(policySources).values(values).returning({ id: policySources.id });
  return result[0].id;
}

export type PolicyEssenceWithDetails = PolicyEssence & {
  source: PolicySource;
  context: PolicyContext | null;
  review: PolicyReview | null;
};

export async function listPolicyEssences(): Promise<PolicyEssenceWithDetails[]> {
  const db = await requireDb();
  const rows = await db
    .select({ essence: policyEssences, source: policySources, context: policyContexts, review: policyReviews })
    .from(policyEssences)
    .innerJoin(policySources, eq(policyEssences.sourceId, policySources.id))
    .leftJoin(policyContexts, eq(policyContexts.policyId, policyEssences.id))
    .leftJoin(policyReviews, eq(policyReviews.policyId, policyEssences.id))
    .orderBy(desc(policyEssences.collectedAt));
  return rows.map(row => ({ ...row.essence, source: row.source, context: row.context, review: row.review }));
}

export async function createPolicyEssence(
  values: Omit<typeof policyEssences.$inferInsert, "id" | "createdAt" | "updatedAt" | "collectedAt">,
) {
  const db = await requireDb();
  const result = await db.insert(policyEssences).values(values).returning({ id: policyEssences.id });
  return result[0].id;
}

export async function upsertPolicyContext(
  values: Omit<typeof policyContexts.$inferInsert, "id" | "updatedAt">,
) {
  const db = await requireDb();
  await db.insert(policyContexts).values(values).onConflictDoUpdate({
    target: policyContexts.policyId,
    set: { ...values, updatedAt: new Date() },
  });
}

export async function upsertPolicyReview(
  values: Omit<typeof policyReviews.$inferInsert, "id" | "updatedAt" | "reviewedAt">,
) {
  const db = await requireDb();
  await db.insert(policyReviews).values(values).onConflictDoUpdate({
    target: policyReviews.policyId,
    set: { ...values, updatedAt: new Date() },
  });
}
