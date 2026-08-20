import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../routers";
import { bindD1Database } from "../db";
import { createContext } from "./context";
import { configureEnv } from "./env";
import { handleStorageProxy } from "./storageProxy";

type WorkerEnv = Record<string, string | undefined> & {
  DB?: unknown;
};

/**
 * CORS for the split deployment: the SPA is served from GitHub Pages while the
 * API lives on the Worker, so the browser sends cross-origin requests with
 * credentials. We echo the request Origin (never `*`) so the session cookie
 * can be sent back with credentials, and answer OPTIONS
 * preflights for the JSON POST / batch requests.
 */
function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  });
  const origin = request.headers.get("Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

function applyCors(response: Response, request: Request): Response {
  const merged = new Headers(response.headers);
  corsHeaders(request).forEach((value, key) => merged.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

/**
 * Single request handler shared by the Cloudflare Worker entry and the local
 * Node adapter. Routes the tRPC API and storage proxy.
 */
export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  configureEnv(env);
  if (env.DB) bindD1Database(env.DB);

  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (url.pathname.startsWith("/api/trpc")) {
    return applyCors(
      await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      }),
      request
    );
  }

  if (url.pathname.startsWith("/manus-storage/")) {
    return applyCors(await handleStorageProxy(request), request);
  }

  return applyCors(new Response("Not found", { status: 404 }), request);
}