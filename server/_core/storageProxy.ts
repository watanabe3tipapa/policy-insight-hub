import { ENV } from "./env";

const PREFIX = "/manus-storage/";

export async function handleStorageProxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(PREFIX)) {
    return new Response("Not found", { status: 404 });
  }

  const key = decodeURIComponent(url.pathname.slice(PREFIX.length));
  if (!key) {
    return new Response("Missing storage key", { status: 400 });
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return new Response("Storage proxy not configured", { status: 500 });
  }

  try {
    const forgeUrl = new URL(
      "v1/storage/presign/get",
      ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
    );
    forgeUrl.searchParams.set("path", key);

    const forgeResp = await fetch(forgeUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!forgeResp.ok) {
      const body = await forgeResp.text().catch(() => "");
      console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
      return new Response("Storage backend error", { status: 502 });
    }

    const { url: signedUrl } = (await forgeResp.json()) as { url: string };
    if (!signedUrl) {
      return new Response("Empty signed URL from backend", { status: 502 });
    }

    return new Response(null, {
      status: 307,
      headers: {
        Location: signedUrl,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    return new Response("Storage proxy error", { status: 502 });
  }
}