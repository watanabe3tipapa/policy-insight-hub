import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
  return next();
});

const nullableText = z.string().max(10_000).optional().nullable();

export const internationalPolicyRouter = router({
  sources: router({
    list: protectedProcedure.query(() => db.listPolicySources()),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(240), organization: z.string().min(1).max(240),
        sourceType: z.enum(["international_org", "government", "research", "other"]),
        reliabilityTier: z.enum(["primary", "independent_evaluation", "peer_reviewed", "secondary"]),
        sourceUrl: z.string().url(), countryOrRegion: z.string().max(160).optional().nullable(),
        language: z.string().max(40).optional().nullable(),
        verificationStatus: z.enum(["pending", "verified", "archived"]), publishedAt: z.date().optional().nullable(),
      }))
      .mutation(({ input }) => db.createPolicySource(input)),
  }),
  essences: router({
    list: protectedProcedure.query(() => db.listPolicyEssences()),
    create: adminProcedure
      .input(z.object({
        sourceId: z.number().int().positive(), sourceCandidateId: z.number().int().positive().optional().nullable(),
        title: z.string().min(1).max(300), country: z.string().min(1).max(160), region: z.string().min(1).max(120),
        policyDomain: z.string().min(1).max(160), policyObjective: z.string().min(1).max(10_000), policySummary: z.string().min(1).max(20_000),
        targetPopulation: nullableText, implementationDesign: nullableText,
        evidenceType: z.enum(["causal", "quasi_experimental", "descriptive", "mixed", "review", "unknown"]),
        evaluationMethod: nullableText, resultSummary: nullableText, outcomeInterpretation: nullableText,
        status: z.enum(["candidate", "reviewed", "published", "archived"]), publishedAt: z.date().optional().nullable(),
      }))
      .mutation(({ input }) => db.createPolicyEssence(input)),
  }),
  contexts: router({
    upsert: adminProcedure
      .input(z.object({ policyId: z.number().int().positive(), socialContext: nullableText, equityConsiderations: nullableText, institutionalContext: nullableText, implementationCapacity: nullableText, riskFactors: nullableText, transferabilityNotes: nullableText }))
      .mutation(({ input }) => db.upsertPolicyContext(input)),
  }),
  reviews: router({
    upsert: adminProcedure
      .input(z.object({
        policyId: z.number().int().positive(), evidenceTransparency: z.enum(["low", "medium", "high"]),
        designCredibility: z.enum(["low", "medium", "high"]), contextFit: z.enum(["low", "medium", "high"]),
        equityImpact: z.enum(["risk", "neutral", "positive", "unclear"]), transferability: z.enum(["low", "medium", "high"]),
        limitations: nullableText, reviewerNote: nullableText,
      }))
      .mutation(({ input }) => db.upsertPolicyReview(input)),
  }),
});
