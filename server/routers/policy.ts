import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const sourceInput = z.object({
  name: z.string().min(1).max(200),
  policyArea: z.string().min(1).max(120),
  owner: z.string().min(1).max(160),
  updateFrequency: z.enum(["daily", "monthly", "quarterly", "annual", "irregular"]),
  sourceUrl: z.string().url().or(z.literal("")),
  description: z.string().max(5000).optional().nullable(),
  lastUpdatedAt: z.date().optional().nullable(),
});

const indicatorInput = z.object({
  name: z.string().min(1).max(200),
  policyArea: z.string().min(1).max(120),
  definition: z.string().min(1).max(5000),
  calculation: z.string().max(5000).optional().nullable(),
  unit: z.string().min(1).max(60),
  targetValue: z.number().finite().optional().nullable(),
  targetDirection: z.enum(["increase", "decrease", "maintain"]),
  dataSourceId: z.number().int().positive().optional().nullable(),
  lastUpdatedAt: z.date().optional().nullable(),
});

export const policyRouter = router({
  sources: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().max(200).optional() }).optional())
      .query(({ input }) => db.listDataSources(input?.search)),
    create: adminProcedure.input(sourceInput).mutation(({ input }) =>
      db.createDataSource({ ...input, sourceUrl: input.sourceUrl || null }),
    ),
    update: adminProcedure
      .input(sourceInput.extend({ id: z.number().int().positive() }))
      .mutation(({ input }) => {
        const { id, ...values } = input;
        return db.updateDataSource(id, { ...values, sourceUrl: values.sourceUrl || null });
      }),
  }),
  indicators: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().max(200).optional() }).optional())
      .query(({ input }) => db.listIndicators(input?.search)),
    create: adminProcedure.input(indicatorInput).mutation(({ input }) => db.createIndicator(input)),
    update: adminProcedure
      .input(indicatorInput.extend({ id: z.number().int().positive() }))
      .mutation(({ input }) => {
        const { id, ...values } = input;
        return db.updateIndicator(id, values);
      }),
    observations: router({
      list: protectedProcedure
        .input(z.object({ indicatorId: z.number().int().positive().optional() }).optional())
        .query(({ input }) => db.listObservations(input?.indicatorId)),
      create: adminProcedure
        .input(
          z.object({
            indicatorId: z.number().int().positive(),
            observedAt: z.date(),
            value: z.number().finite(),
            note: z.string().max(2000).optional().nullable(),
          }),
        )
        .mutation(({ input }) => db.createObservation(input)),
    }),
  }),
  reviews: router({
    list: protectedProcedure.query(() => db.listReviews()),
    create: adminProcedure
      .input(
        z.object({
          policyArea: z.string().min(1).max(120),
          heldAt: z.date(),
          agenda: z.string().min(1).max(5000),
          summary: z.string().max(5000).optional().nullable(),
          status: z.enum(["scheduled", "completed", "closed"]),
        }),
      )
      .mutation(({ input }) => db.createReview(input)),
    update: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          policyArea: z.string().min(1).max(120).optional(),
          heldAt: z.date().optional(),
          agenda: z.string().min(1).max(5000).optional(),
          summary: z.string().max(5000).optional().nullable(),
          status: z.enum(["scheduled", "completed", "closed"]).optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, ...values } = input;
        return db.updateReview(id, values);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteReview(input.id)),
    actions: router({
      create: adminProcedure
        .input(
          z.object({
            reviewId: z.number().int().positive(),
            actionItem: z.string().min(1).max(5000),
            assignee: z.string().min(1).max(160),
            dueAt: z.date().optional().nullable(),
            status: z.enum(["open", "in_progress", "completed"]),
            result: z.string().max(5000).optional().nullable(),
          }),
        )
        .mutation(({ input }) => db.createReviewAction(input)),
      update: adminProcedure
        .input(
          z.object({
            id: z.number().int().positive(),
            actionItem: z.string().min(1).max(5000).optional(),
            assignee: z.string().min(1).max(160).optional(),
            dueAt: z.date().optional().nullable(),
            status: z.enum(["open", "in_progress", "completed"]).optional(),
            result: z.string().max(5000).optional().nullable(),
          }),
        )
        .mutation(({ input }) => {
          const { id, ...values } = input;
          return db.updateReviewAction(id, values);
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(({ input }) => db.deleteReviewAction(input.id)),
    }),
  }),
});

export const policyInputSchemas = { sourceInput, indicatorInput };
