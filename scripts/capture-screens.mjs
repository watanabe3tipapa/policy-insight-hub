// Display-verification screenshot capture.
//
// Serves the built SPA (dist/public) and captures each authenticated page with
// the tRPC API mocked at the HTTP layer, so the screenshots render without a
// real OAuth session or D1 database. Mock data shows the app's empty states and
// the admin UI. Run with: pnpm screenshot
//
// Requires: `pnpm build` (or run the script, which rebuilds) and Playwright's
// chromium (`pnpm exec playwright install chromium`).

import { chromium } from "playwright";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { createReadStream, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import superjson from "superjson";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "dist", "public");
const OUT_DIR = path.join(ROOT, "screenshots");
const PORT = 4719;
const BASE = `http://localhost:${PORT}`;

const ROUTES = [
  { name: "dashboard", path: "/", expect: "政策インサイト・ダッシュボード" },
  { name: "sources", path: "/sources", expect: "データソースがありません" },
  { name: "indicators", path: "/indicators", expect: "登録済みの指標がありません" },
  { name: "reviews", path: "/reviews", expect: "レビューの記録がありません" },
  { name: "collection", path: "/collection", expect: "Kitesurf連携" },
  { name: "policy-essences", path: "/policy-essences", expect: "国際EBPM政策エッセンス" },
  { name: "data-exchange", path: "/data-exchange", expect: "SQLite .db" },
];

const FAKE_USER = {
  openId: "mock-openid",
  name: "Toolsmith",
  email: "admin@example.com",
  loginMethod: "mock",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSignedIn: "2026-08-18T00:00:00.000Z",
};

function mockForPath(procPath) {
  if (procPath === "auth.me") return FAKE_USER;
  if (procPath === "kitesurf.config" || procPath === "kitesurf.startupAudit") {
    return null;
  }
  return [];
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

function startServer() {
  return http
    .createServer((req, res) => {
      const url = new URL(req.url, BASE);
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        pathname = url.pathname;
      }
      if (pathname.startsWith("/policy-insight-hub/")) {
        pathname = pathname.slice("/policy-insight-hub".length);
      }
      if (pathname === "/") pathname = "/index.html";
      const filePath = path.join(PUBLIC_DIR, pathname);
      const resolved =
        filePath.startsWith(PUBLIC_DIR) && statSync(filePath, { throwIfNoEntry: false })
          ? filePath
          : null;
      if (!resolved && path.extname(pathname)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const target = resolved ?? path.join(PUBLIC_DIR, "index.html");
      res.writeHead(200, { "Content-Type": MIME[path.extname(target)] ?? "text/html" });
      createReadStream(target).pipe(res);
    })
    .listen(PORT, "127.0.0.1");
}

function mockTrpc(pathnames) {
  return pathnames.map((procPath) => ({
    result: { data: superjson.serialize(mockForPath(procPath)) },
  }));
}

async function run() {
  execFileSync("pnpm", ["build"], { cwd: ROOT, stdio: "inherit" });
  mkdirSync(OUT_DIR, { recursive: true });

  const server = startServer();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isApi = url.pathname.startsWith("/api/trpc");
    if (isApi) {
      const pathSegment = url.pathname.replace(/^\/api\/trpc\/?/, "");
      const paths = pathSegment.split(",").filter(Boolean);
      const isBatch = url.searchParams.get("batch") === "1" || paths.length > 1;
      const body = isBatch
        ? mockTrpc(paths)
        : { result: { data: superjson.serialize(mockForPath(paths[0] ?? "")) } };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      return;
    }
    const host = url.hostname;
    if (host === "127.0.0.1" || host === "localhost") {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  const results = [];
  for (const { name, path: routePath, expect } of ROUTES) {
    try {
      const url = `${BASE}/policy-insight-hub/index.html#${routePath}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800);
      const shotPath = path.join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      const bodyText = await page.evaluate(() => document.body.innerText);
      const matched = expect ? bodyText.includes(expect) : true;
      results.push({ name, routePath, ok: matched, file: shotPath, matched, expect });
      if (!matched) {
        const html = await page.content();
        console.log(`  [${name}] expected "${expect}" — url=${page.url()} html=${html.slice(0, 300)}`);
      }
    } catch (error) {
      results.push({ name, routePath, ok: false, error: String(error.message) });
    }
  }

  await browser.close();
  server.close();

  for (const r of results) {
    console.log(
      r.ok
        ? `OK   ${r.routePath} -> ${r.file}${r.expect ? ` (contains "${r.expect}")` : ""}`
        : `FAIL ${r.routePath}: ${r.error ?? `missing "${r.expect}"`}`,
    );
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
