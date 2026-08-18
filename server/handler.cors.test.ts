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
      { VITE_APP_ID: "app", JWT_SECRET: "s" }
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
      { VITE_APP_ID: "app", JWT_SECRET: "s" }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(API_ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("mints the oauth state cookie on the API origin via /api/oauth/start", async () => {
    const res = await handleRequest(
      new Request(`${WORKER}/api/oauth/start`, {
        method: "POST",
        headers: { Origin: API_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: "test-nonce-123" }),
      }),
      {}
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(API_ORIGIN);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("__Host-oauth_state=test-nonce-123");
    expect(setCookie).toContain("SameSite=None");
    expect(setCookie).toContain("Secure");
  });

  it("rejects /api/oauth/start without a nonce", async () => {
    const res = await handleRequest(
      new Request(`${WORKER}/api/oauth/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {}
    );

    expect(res.status).toBe(400);
  });
});
