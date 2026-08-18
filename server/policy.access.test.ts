import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { policyInputSchemas } from "./routers/policy";
import type { TrpcContext } from "./_core/context";

function createUserContext(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "policy-test-user",
      name: "Policy Test User",
      email: "policy-test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: new Request("https://example.com/api/trpc") as TrpcContext["req"],
    resHeaders: new Headers(),
  };
}

describe("policy input contracts", () => {
  it("accepts a complete data-source record", () => {
    expect(
      policyInputSchemas.sourceInput.parse({
        name: "行政統計",
        policyArea: "子育て支援",
        owner: "企画部",
        updateFrequency: "monthly",
        sourceUrl: "https://example.gov/data",
        description: "月次集計",
        lastUpdatedAt: new Date("2026-08-01"),
      }),
    ).toMatchObject({ name: "行政統計", updateFrequency: "monthly" });
  });

  it("rejects a data-source update by a general user before database access", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(
      caller.policy.sources.create({
        name: "行政統計",
        policyArea: "子育て支援",
        owner: "企画部",
        updateFrequency: "monthly",
        sourceUrl: "",
        description: null,
        lastUpdatedAt: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
