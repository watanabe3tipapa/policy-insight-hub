import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    dbName: "policy-insight-hub",
    wranglerConfigPath: "wrangler.toml",
  },
});