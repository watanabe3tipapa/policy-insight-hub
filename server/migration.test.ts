import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const EXPECTED_TABLES = [
  "users",
  "data_sources",
  "indicators",
  "indicator_observations",
  "reviews",
  "review_actions",
  "kitesurf_configs",
  "collection_runs",
  "source_candidates",
  "policy_sources",
  "policy_essences",
  "policy_contexts",
  "policy_reviews",
];

const STARTUP_REFRESH_COLUMNS = [
  "autoRefreshEnabled",
  "staleAfterHours",
  "lastStartupCheckAt",
  "lastStartupOutcome",
  "lastStartupMessage",
  "lastStartupRefreshAt",
  "startupRefreshLeaseUntil",
];

describe("Drizzle SQLite migration is reproducible", () => {
  it("applies the generated migration and reproduces all tables", async () => {
    const migrationSQL = readFileSync(
      path.resolve(import.meta.dirname, "../drizzle/0000_talented_blade.sql"),
      "utf-8",
    );

    const SqlJs = await initSqlJs({
      locateFile: () =>
        path.resolve(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
    });
    const db = new SqlJs.Database();

    const statements = migrationSQL.split("--> statement-breakpoint")
      .map(s => s.trim())
      .filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);

    for (const statement of statements) {
      db.run(statement);
    }

    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tables = (result[0]?.values.map(row => row[0]) ?? []).map(String);

    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }

    const columnsResult = db.exec("PRAGMA table_info(kitesurf_configs)");
    const columns = (columnsResult[0]?.values.map(row => row[1]) ?? []).map(String);
    for (const column of STARTUP_REFRESH_COLUMNS) {
      expect(columns).toContain(column);
    }

    db.close();
  });
});