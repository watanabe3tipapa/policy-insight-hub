import { describe, expect, it } from "vitest";
import { handleRequest } from "./_core/handler";

const API_ORIGIN = "https://watanabe3tipapa.github.io";
const WORKER = "https://policy-insight-hub-api.watanabe3ti.workers.dev";

describe("handler CORS for the split deployment", () => {
  it("answers OPTIONS preflight with origin-echoing CORS headers", async () => {
    const res = await handleRequest(
      new Request(`${WORKER}/api/trpc/system.health`, {
        method: "OPTIONS",
        headers: { Origin: API_ORIGIN },
      }),
      { JWT_SECRET: "s" }
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(API_ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("attaches CORS headers to tRPC responses when an Origin is present", async () => {
    const res = await handleRequest(
      new Request(
        `${WORKER}/api/trpc/system.health?input=${encodeURIComponent(
          JSON.stringify({ json: { timestamp: 1 } })
        )}`,
        { headers: { Origin: API_ORIGIN } }
      ),
      { JWT_SECRET: "s" }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(API_ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});
