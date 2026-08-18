import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getKitesurfConfig: vi.fn(),
  getLatestSuccessfulKitesurfRun: vi.fn(),
  recordKitesurfStartupState: vi.fn(),
  acquireKitesurfStartupLease: vi.fn(),
  createCollectionRun: vi.fn(),
  createSourceCandidate: vi.fn(),
  updateCollectionRun: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { isKitesurfDataStale, runStartupStaleRefresh } from "./startupRefresh";
import { toStartupAuditView } from "../client/src/lib/startupAudit";

function createAuditContext(): TrpcContext {
  return {
    user: { id: 96, openId: "startup-audit", name: "Startup Audit", email: null, loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: new Request("https://example.com/api/trpc") as TrpcContext["req"],
    resHeaders: new Headers(),
  };
}

describe("startup stale refresh", () => {
  const now = new Date("2026-08-18T00:00:00.000Z");
  const readyConfig = { workerUrl: "https://kitesurf.example", autoRefreshEnabled: 1, staleAfterHours: 24 } as any;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks missing or old successful collection results as stale", () => {
    expect(isKitesurfDataStale(undefined, 24, now)).toBe(true);
    expect(isKitesurfDataStale(new Date("2026-08-16T23:59:59.000Z"), 24, now)).toBe(true);
  });

  it("does not refresh when the latest successful collection is inside the freshness window", () => {
    expect(isKitesurfDataStale(new Date("2026-08-17T12:00:00.000Z"), 24, now)).toBe(false);
  });

  it("safely skips startup refresh when database configuration cannot be loaded", async () => {
    vi.mocked(db.getKitesurfConfig).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(runStartupStaleRefresh({ now })).resolves.toMatchObject({ outcome: "skipped_unavailable" });
  });

  it("records an unconfigured skip when no Kitesurf configuration exists", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(undefined);
    await expect(runStartupStaleRefresh({ now })).resolves.toMatchObject({ outcome: "skipped_unconfigured" });
  });

  it("persists an unconfigured audit state when a saved configuration has no Worker URL", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce({ workerUrl: null, autoRefreshEnabled: 1, staleAfterHours: 24 } as any);
    await expect(runStartupStaleRefresh({ now })).resolves.toMatchObject({ outcome: "skipped_unconfigured" });
    expect(db.recordKitesurfStartupState).toHaveBeenCalledWith("skipped_unconfigured", expect.any(String), now);
  });

  it("records a fresh skip without acquiring a refresh lease", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(readyConfig);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce({ completedAt: new Date("2026-08-17T12:00:00.000Z"), createdAt: new Date("2026-08-17T12:00:00.000Z") } as any);
    await expect(runStartupStaleRefresh({ now })).resolves.toMatchObject({ outcome: "skipped_fresh" });
    expect(db.recordKitesurfStartupState).toHaveBeenCalledWith("skipped_fresh", expect.any(String), now);
    expect(db.acquireKitesurfStartupLease).not.toHaveBeenCalled();
  });

  it("skips when another startup holds the refresh lease", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(readyConfig);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce(undefined);
    vi.mocked(db.acquireKitesurfStartupLease).mockResolvedValueOnce(false);
    await expect(runStartupStaleRefresh({ now })).resolves.toMatchObject({ outcome: "skipped_leased" });
    expect(db.createCollectionRun).not.toHaveBeenCalled();
  });

  it("records a failed collection run when the Worker responds with an error", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(readyConfig);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce(undefined);
    vi.mocked(db.acquireKitesurfStartupLease).mockResolvedValueOnce(true);
    vi.mocked(db.createCollectionRun).mockResolvedValueOnce(91 as any);
    await expect(runStartupStaleRefresh({ now, fetcher: vi.fn().mockResolvedValue(new Response("busy", { status: 503 })) })).resolves.toMatchObject({ outcome: "failed" });
    expect(db.updateCollectionRun).toHaveBeenCalledWith(91, expect.objectContaining({ status: "failed" }));
    expect(db.recordKitesurfStartupState).toHaveBeenCalledWith("failed", expect.any(String), expect.any(Date));
  });

  it("stores Worker candidates and marks the startup update as successful", async () => {
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(readyConfig);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce(undefined);
    vi.mocked(db.acquireKitesurfStartupLease).mockResolvedValueOnce(true);
    vi.mocked(db.createCollectionRun).mockResolvedValueOnce(92 as any);
    vi.mocked(db.createSourceCandidate).mockResolvedValue(undefined as any);
    await expect(runStartupStaleRefresh({ now, fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary: "1件取得", candidates: [{ name: "公開評価", url: "https://example.org/evaluation", policyArea: "社会保護" }] }), { status: 200 })) })).resolves.toMatchObject({ outcome: "succeeded", candidates: 1 });
    expect(db.createSourceCandidate).toHaveBeenCalledWith(expect.objectContaining({ collectionRunId: 92, name: "公開評価" }));
    expect(db.updateCollectionRun).toHaveBeenCalledWith(92, expect.objectContaining({ status: "succeeded" }));
    expect(db.recordKitesurfStartupState).toHaveBeenCalledWith("succeeded", expect.any(String), expect.any(Date));
  });

  it("carries a persisted startup audit through API-shaped data into the collection view", async () => {
    let persisted: { lastStartupCheckAt: Date | null; lastStartupOutcome: string | null; lastStartupMessage: string | null; lastStartupRefreshAt: Date | null } | null = null;
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce(readyConfig);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce(undefined);
    vi.mocked(db.acquireKitesurfStartupLease).mockResolvedValueOnce(true);
    vi.mocked(db.createCollectionRun).mockResolvedValueOnce(93 as any);
    vi.mocked(db.createSourceCandidate).mockResolvedValue(undefined as any);
    vi.mocked(db.recordKitesurfStartupState).mockImplementation(async (outcome, message, checkedAt) => {
      persisted = { lastStartupCheckAt: checkedAt, lastStartupOutcome: outcome, lastStartupMessage: message, lastStartupRefreshAt: checkedAt };
    });

    await runStartupStaleRefresh({ now, fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary: "1件の候補を受信しました。" }), { status: 200 })) });
    const startupAuditApiResponse = persisted;
    expect(startupAuditApiResponse).toMatchObject({ lastStartupOutcome: "succeeded", lastStartupMessage: "起動時更新を完了し、0件の候補を受信しました。" });
    expect(toStartupAuditView(startupAuditApiResponse)).toMatchObject({ label: "更新完了", message: "起動時更新を完了し、0件の候補を受信しました。" });
  });

  it("returns the audit saved by startup refresh through the real startupAudit router procedure", async () => {
    let configRecord: any = { ...readyConfig, lastStartupCheckAt: null, lastStartupOutcome: "idle", lastStartupMessage: null, lastStartupRefreshAt: null };
    vi.mocked(db.getKitesurfConfig).mockImplementation(async () => configRecord);
    vi.mocked(db.getLatestSuccessfulKitesurfRun).mockResolvedValueOnce(undefined);
    vi.mocked(db.acquireKitesurfStartupLease).mockResolvedValueOnce(true);
    vi.mocked(db.createCollectionRun).mockResolvedValueOnce(94 as any);
    vi.mocked(db.recordKitesurfStartupState).mockImplementation(async (outcome, message, checkedAt) => {
      configRecord = { ...configRecord, lastStartupOutcome: outcome, lastStartupMessage: message, lastStartupCheckAt: checkedAt, lastStartupRefreshAt: outcome === "succeeded" ? checkedAt : null };
    });

    await runStartupStaleRefresh({ now, fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ name: "公開資料" }] }), { status: 200 })) });
    const audit = await appRouter.createCaller(createAuditContext()).kitesurf.startupAudit();
    expect(audit).toMatchObject({ lastStartupOutcome: "succeeded", lastStartupMessage: "起動時更新を完了し、1件の候補を受信しました。", lastStartupCheckAt: expect.any(Date) });
    expect(toStartupAuditView(audit)).toMatchObject({ label: "更新完了", message: "起動時更新を完了し、1件の候補を受信しました。" });
  });
});
