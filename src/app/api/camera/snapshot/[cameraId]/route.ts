import { NextRequest } from "next/server";

const CAMERA_URLS: Record<string, string | undefined> = {
  entry_gate: process.env.NEXT_PUBLIC_ENTRY_CAM,
  exit_gate: process.env.NEXT_PUBLIC_EXIT_CAM,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
) {
  const { cameraId } = await params;
  const rawUrl = CAMERA_URLS[cameraId];

  if (!rawUrl) {
    return new Response("Unknown camera ID", { status: 404 });
  }

  const proxyBase = new URL(_request.url).origin;
  const proxyUrl = `${proxyBase}/api/camera/proxy?url=${encodeURIComponent(rawUrl)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response("Camera unreachable", { status: 502 });
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg";

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return new Response("Failed to connect to camera", { status: 502 });
  }
}
