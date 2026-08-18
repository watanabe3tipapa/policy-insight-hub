import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUserContext(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 31,
      openId: "international-policy-test-user",
      name: "International Policy Test User",
      email: "international-policy-test@example.com",
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

describe("international policy access control", () => {
  it("rejects new source registration by a general user before database access", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(
      caller.internationalPolicy.sources.create({
        name: "Independent Evaluation Group",
        organization: "World Bank Group",
        sourceType: "international_org",
        reliabilityTier: "independent_evaluation",
        sourceUrl: "https://ieg.worldbankgroup.org/",
        countryOrRegion: "Global",
        language: "English",
        verificationStatus: "pending",
        publishedAt: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
