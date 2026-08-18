import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../routers";
import { bindD1Database } from "../db";
import { createContext } from "./context";
import { configureEnv } from "./env";
import { handleOAuthCallback } from "./oauth";
import { handleStorageProxy } from "./storageProxy";

type WorkerEnv = Record<string, string | undefined> & {
  DB?: unknown;
};

/**
 * Single request handler shared by the Cloudflare Worker entry and the local
 * Node adapter. Routes the tRPC API, OAuth callback and storage proxy.
 */
export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  configureEnv(env);
  if (env.DB) bindD1Database(env.DB);

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/trpc")) {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext,
    });
  }

  if (url.pathname === "/api/oauth/callback") {
    return handleOAuthCallback(request);
  }

  if (url.pathname.startsWith("/manus-storage/")) {
    return handleStorageProxy(request);
  }

  return new Response("Not found", { status: 404 });
}