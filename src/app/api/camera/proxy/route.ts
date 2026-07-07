import { NextRequest } from "next/server";

const ALLOWED_HOSTS = (process.env.CAMERA_PROXY_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

function isHostAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.length === 0) return true;
  if (ALLOWED_HOSTS.includes("*")) return true;
  return ALLOWED_HOSTS.includes(hostname);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response("Protocol not allowed", { status: 403 });
  }

  if (!isHostAllowed(parsed.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { Accept: "image/jpeg, multipart/x-mixed-replace, */*" },
    });
    clearTimeout(timeout);

    console.error(
      `[camera-proxy] ${response.status} ${parsed.toString()} content-type=${response.headers.get("content-type")}`,
    );

    const contentType = response.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=--BoundaryBoundary";

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
} catch (err: unknown) {
  console.error("[camera-proxy] fetch failed:", parsed.toString(), err);
  return new Response("Failed to connect to camera", { status: 502 });
}
}
