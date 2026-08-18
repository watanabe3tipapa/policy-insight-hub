import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader, serialize } from "cookie";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Mints the OAuth `state` cookie on the API origin. In the split deployment the
 * SPA (GitHub Pages) and the callback (Cloudflare Worker) live on different
 * origins, so a cookie set from the SPA page would never reach the callback.
 * The client POSTs its one-time nonce here instead and the callback validates
 * the state against this same-origin cookie.
 */
export async function handleOAuthStart(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { nonce?: unknown };
    if (typeof body?.nonce !== "string" || body.nonce.length === 0) {
      return json({ error: "nonce is required" }, 400);
    }
    const stateCookie = serialize(OAUTH_STATE_COOKIE, body.nonce, {
      path: "/",
      secure: true,
      sameSite: "none",
      maxAge: 600,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": stateCookie,
      },
    });
  } catch {
    return json({ error: "invalid body" }, 400);
  }
}

export async function handleOAuthCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return json({ error: "code and state are required" }, 400);
  }

  const { nonce, redirectUri } = decodeOAuthState(state);
  const expectedNonce = parseCookieHeader(req.headers.get("cookie") ?? "")[OAUTH_STATE_COOKIE];
  if (!nonce || nonce !== expectedNonce) {
    return json({ error: "invalid oauth state" }, 403);
  }

  const clearState = serialize(OAUTH_STATE_COOKIE, "", {
    path: "/",
    secure: true,
    sameSite: "none",
    maxAge: -1,
  });

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return json({ error: "openId missing from user info" }, 400);
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    const session = serialize(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS,
    });

    // Redirect back to the client origin. In the split deployment (GitHub Pages
    // frontend + Worker API) the SPA origin is set explicitly via SPA_ORIGIN,
    // otherwise we fall back to the origin of the callback URL carried in
    // `state` (which matches in the same-origin local setup).
    const returnOrigin = ENV.spaOrigin || (redirectUri ? new URL(redirectUri).origin : url.origin);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${returnOrigin}/`,
        "Set-Cookie": [clearState, session].join(", "),
      },
    });
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return json({ error: "OAuth callback failed" }, 500);
  }
}