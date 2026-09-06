export const ENV = {
  cookieSecret: "",
  adminUsername: "",
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
  ENV.adminUsername = source.ADMIN_USERNAME ?? "";
  ENV.isProduction = source.NODE_ENV === "production";
  ENV.forgeApiUrl = source.BUILT_IN_FORGE_API_URL ?? "";
  ENV.forgeApiKey = source.BUILT_IN_FORGE_API_KEY ?? "";
}