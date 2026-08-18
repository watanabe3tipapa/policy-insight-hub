import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
  }
  return next();
});

export const kitesurfRouter = router({
  config: protectedProcedure.query(() => db.getKitesurfConfig()),
  startupAudit: protectedProcedure.query(async () => {
    const config = await db.getKitesurfConfig();
    if (!config) return null;
    return {
      lastStartupCheckAt: config.lastStartupCheckAt,
      lastStartupOutcome: config.lastStartupOutcome,
      lastStartupMessage: config.lastStartupMessage,
      lastStartupRefreshAt: config.lastStartupRefreshAt,
    };
  }),
  saveConfig: adminProcedure
    .input(z.object({ workerUrl: z.string().url().nullable() }))
    .mutation(({ input }) => db.saveKitesurfConfig(input.workerUrl)),
  updateRefreshSettings: adminProcedure
    .input(z.object({ autoRefreshEnabled: z.boolean(), staleAfterHours: z.number().int().min(1).max(168) }))
    .mutation(({ input }) => db.updateKitesurfRefreshSettings(input.autoRefreshEnabled, input.staleAfterHours)),
  runs: protectedProcedure.query(() => db.listCollectionRuns()),
  candidates: protectedProcedure.query(() => db.listSourceCandidates()),
  createRun: adminProcedure
    .input(
      z.object({
        requestUrl: z.string().url(),
        requestMode: z.enum(["simple", "instruction"]),
        instruction: z.string().max(5000).optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      db.createCollectionRun({ ...input, provider: "kitesurf", status: "queued", createdByUserId: ctx.user.id }),
    ),
  updateRun: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["queued", "running", "succeeded", "failed"]).optional(),
        resultSummary: z.string().max(10_000).optional().nullable(),
        resultUrl: z.string().url().optional().nullable(),
        errorMessage: z.string().max(10_000).optional().nullable(),
        completedAt: z.date().optional().nullable(),
      }),
    )
    .mutation(({ input }) => {
      const { id, ...values } = input;
      return db.updateCollectionRun(id, values);
    }),
  createCandidate: adminProcedure
    .input(
      z.object({
        collectionRunId: z.number().int().positive().optional().nullable(),
        name: z.string().min(1).max(200),
        candidateUrl: z.string().url().optional().nullable(),
        description: z.string().max(5000).optional().nullable(),
        suggestedPolicyArea: z.string().max(120).optional().nullable(),
      }),
    )
    .mutation(({ input }) => db.createSourceCandidate({ ...input, status: "pending" })),
  updateCandidate: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["pending", "accepted", "rejected"]).optional(),
        name: z.string().min(1).max(200).optional(),
        candidateUrl: z.string().url().optional().nullable(),
        description: z.string().max(5000).optional().nullable(),
        suggestedPolicyArea: z.string().max(120).optional().nullable(),
      }),
    )
    .mutation(({ input }) => {
      const { id, status, ...values } = input;
      return db.updateSourceCandidate(id, { ...values, status, reviewedAt: status && status !== "pending" ? new Date() : undefined });
    }),
});
