export const ENV = {
  appId: "",
  cookieSecret: "",
  oAuthServerUrl: "",
  ownerOpenId: "",
  isProduction: false,
  forgeApiUrl: "",
  forgeApiKey: "",
  spaOrigin: "",
};

type EnvRecord = Record<string, string | undefined>;

/**
 * Populates the app configuration from an environment source. The Node entry
 * passes `process.env`; the Cloudflare Worker entry passes its bindings object.
 * Called once before the server starts serving requests.
 */
export function configureEnv(source: EnvRecord) {
  ENV.appId = source.VITE_APP_ID ?? "";
  ENV.cookieSecret = source.JWT_SECRET ?? "";
  ENV.oAuthServerUrl = source.OAUTH_SERVER_URL ?? "";
  ENV.ownerOpenId = source.OWNER_OPEN_ID ?? "";
  ENV.isProduction = source.NODE_ENV === "production";
  ENV.forgeApiUrl = source.BUILT_IN_FORGE_API_URL ?? "";
  ENV.forgeApiKey = source.BUILT_IN_FORGE_API_KEY ?? "";
  ENV.spaOrigin = source.SPA_ORIGIN ?? "";
}