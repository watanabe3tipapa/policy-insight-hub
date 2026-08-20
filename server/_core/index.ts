import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import type { IncomingMessage, ServerResponse } from "http";
import { configureEnv } from "./env";
import { handleRequest } from "./handler";
import { startStartupStaleRefresh } from "../startupRefresh";
import { serveStatic, setupVite } from "./vite";

configureEnv(process.env as Record<string, string | undefined>);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Adapts a Node/Express request into the shared fetch handler and writes the
 * resulting fetch Response back to the Node response.
 */
type DispatchRequest = IncomingMessage & { originalUrl?: string };

async function dispatchNodeRequest(req: DispatchRequest, res: ServerResponse) {
  try {
    const host = req.headers.host ?? "localhost";
    const url = `http://${host}${req.originalUrl ?? req.url ?? "/"}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const method = req.method ?? "GET";
    const body = await readBody(req);
    const request = new Request(url, {
      method,
      headers,
      body: body.length > 0 ? body : undefined,
      duplex: "half",
    } as RequestInit);

    const response = await handleRequest(request, process.env as Record<string, string | undefined>);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[Request] failed:", error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // API routes are handled by the shared fetch handler (same code path as the
  // Cloudflare Worker). Mount them before the body parsers so the raw stream is
  // available for adaptation.
  app.use("/manus-storage", (req, res) => void dispatchNodeRequest(req, res));
  app.use("/api/trpc", (req, res) => void dispatchNodeRequest(req, res));

  // SPA handling (local dev/production); the split deployment serves the SPA
  // from GitHub Pages instead, so these branches are only for local runs.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startStartupStaleRefresh();
  });
}

startServer().catch(console.error);