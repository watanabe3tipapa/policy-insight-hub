import * as db from "./db";

const LEASE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 45 * 1000;

type CandidatePayload = { name: string; url?: string; description?: string; policyArea?: string };
type WorkerPayload = { summary?: string; resultUrl?: string; candidates?: CandidatePayload[] };
type FetchLike = typeof fetch;

export function isKitesurfDataStale(lastSuccess: Date | null | undefined, staleAfterHours: number, now = new Date()) {
  if (!lastSuccess) return true;
  return now.valueOf() - lastSuccess.valueOf() >= Math.max(1, staleAfterHours) * 60 * 60 * 1000;
}

function collectEndpoint(workerUrl: string) {
  const trimmed = workerUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/collect") ? trimmed : `${trimmed}/collect`;
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { return new URL(value).toString(); } catch { return null; }
}

function parseWorkerPayload(text: string): WorkerPayload {
  try {
    const payload = JSON.parse(text) as unknown;
    if (!payload || typeof payload !== "object") return {};
    const raw = payload as Record<string, unknown>;
    const candidates = Array.isArray(raw.candidates)
      ? raw.candidates
          .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === "object")
          .map(candidate => ({
            name: typeof candidate.name === "string" ? candidate.name.slice(0, 200) : "",
            url: safeUrl(candidate.url) ?? undefined,
            description: typeof candidate.description === "string" ? candidate.description.slice(0, 5000) : undefined,
            policyArea: typeof candidate.policyArea === "string" ? candidate.policyArea.slice(0, 120) : undefined,
          }))
          .filter(candidate => candidate.name.length > 0)
      : [];
    return {
      summary: typeof raw.summary === "string" ? raw.summary.slice(0, 10_000) : undefined,
      resultUrl: safeUrl(raw.resultUrl) ?? undefined,
      candidates,
    };
  } catch {
    return {};
  }
}

export async function runStartupStaleRefresh(options: { now?: Date; fetcher?: FetchLike } = {}) {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  let config: Awaited<ReturnType<typeof db.getKitesurfConfig>>;
  try {
    config = await db.getKitesurfConfig();
  } catch {
    return { outcome: "skipped_unavailable" as const, reason: "データベースまたはKitesurf設定に接続できません。" };
  }
  if (!config) return { outcome: "skipped_unconfigured" as const, reason: "Kitesurf設定が存在しません。" };
  if (!config.workerUrl || config.autoRefreshEnabled !== 1) {
    await db.recordKitesurfStartupState("skipped_unconfigured", "Worker URL未設定または起動時自動更新が無効です。", now);
    return { outcome: "skipped_unconfigured" as const, reason: "Worker URL未設定または自動更新無効" };
  }
  const latest = await db.getLatestSuccessfulKitesurfRun();
  const reference = latest?.completedAt ?? latest?.createdAt;
  if (!isKitesurfDataStale(reference, config.staleAfterHours, now)) {
    await db.recordKitesurfStartupState("skipped_fresh", `最終成功収集は${config.staleAfterHours}時間以内です。`, now);
    return { outcome: "skipped_fresh" as const, reason: "収集データは新しい状態です。" };
  }
  const acquired = await db.acquireKitesurfStartupLease(now, new Date(now.valueOf() + LEASE_MS));
  if (!acquired) return { outcome: "skipped_leased" as const, reason: "別の起動プロセスが更新中です。" };

  const endpoint = collectEndpoint(config.workerUrl);
  let runId: number | null = null;
  try {
    runId = Number(await db.createCollectionRun({ provider: "kitesurf", requestUrl: endpoint, requestMode: "instruction", instruction: "startup_stale_check" , status: "running", resultSummary: null, resultUrl: null, errorMessage: null, createdByUserId: null }));
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ trigger: "startup_stale_check", format: "policy-insight-hub.v1", requestedAt: now.toISOString() }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Worker returned ${response.status}: ${text.slice(0, 500)}`);
    const payload = parseWorkerPayload(text);
    const candidates = payload.candidates ?? [];
    await Promise.all(candidates.map(candidate => db.createSourceCandidate({ collectionRunId: runId, name: candidate.name, candidateUrl: candidate.url ?? null, description: candidate.description ?? null, suggestedPolicyArea: candidate.policyArea ?? null, status: "pending" })));
    await db.updateCollectionRun(runId, { status: "succeeded", resultSummary: payload.summary ?? `起動時更新で${candidates.length}件の候補を受信しました。`, resultUrl: payload.resultUrl ?? null, errorMessage: null, completedAt: new Date() });
    await db.recordKitesurfStartupState("succeeded", `起動時更新を完了し、${candidates.length}件の候補を受信しました。`, new Date());
    return { outcome: "succeeded" as const, candidates: candidates.length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 10_000) : "不明な更新エラー";
    if (runId) await db.updateCollectionRun(runId, { status: "failed", errorMessage: message, completedAt: new Date() });
    await db.recordKitesurfStartupState("failed", message, new Date());
    return { outcome: "failed" as const, reason: message };
  }
}

export function startStartupStaleRefresh() {
  void runStartupStaleRefresh()
    .then(result => console.info("[StartupRefresh]", result.outcome))
    .catch(error => console.error("[StartupRefresh] skipped after startup exception", error));
}
