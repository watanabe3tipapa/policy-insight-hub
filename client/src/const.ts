import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, persists the `state` cookie
// (same-origin: on this page; split deployment: on the API origin via
// /api/oauth/start), and navigates immediately — so the cookie nonce always
// matches the `state` it sends. Do NOT call it during render (no
// `href={startLogin()}` / `loginUrl={...}`): each call overwrites the cookie,
// so a stray render-phase call would desync it from an in-flight login and the
// callback would reject it with "invalid oauth state". It returns void by
// design, so there is no URL to stash across renders.
export const startLogin = async () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // OAuth callback lives on the same origin as the API. In the split deployment
  // (GitHub Pages SPA + Cloudflare Worker API) this is the Worker origin; when
  // running locally it falls back to the current (same-origin) origin.
  const apiUrl = import.meta.env.VITE_API_URL;
  const callbackOrigin = apiUrl ? new URL(apiUrl).origin : window.location.origin;
  const redirectUri = `${callbackOrigin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  const state = encodeOAuthState({ redirectUri, nonce });

  if (apiUrl) {
    // Split deployment: the callback runs on the Worker origin, so persist the
    // state nonce as a cookie there (the SPA cookie would never reach it).
    try {
      await fetch(`${callbackOrigin}/api/oauth/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce }),
      });
    } catch {
      // Fall through to the portal; the callback will reject with an invalid
      // state if the cookie never landed, which is the safe outcome.
    }
  } else {
    document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  }

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
