export const ENV = {
  cookieSecret: "",
  ownerOpenId: "",
  adminPassword: "",
  isProduction: false,
  forgeApiUrl: "",
  forgeApiKey: "",
};

type EnvRecord = Record<string, string | undefined>;

/**
 * Populates the app configuration from an environment source. The Node entry
 * passes `process.env`; the Cloudflare Worker entry passes its bindings object.
 * Called once before the server starts serving requests.
 */
export function configureEnv(source: EnvRecord) {
  ENV.cookieSecret = source.JWT_SECRET ?? "";
  ENV.ownerOpenId = source.OWNER_OPEN_ID ?? "";
  ENV.adminPassword = source.ADMIN_PASSWORD ?? "";
  ENV.isProduction = source.NODE_ENV === "production";
  ENV.forgeApiUrl = source.BUILT_IN_FORGE_API_URL ?? "";
  ENV.forgeApiKey = source.BUILT_IN_FORGE_API_KEY ?? "";
}