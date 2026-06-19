import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=--BoundaryBoundary";

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch {
    return new Response("Failed to connect to camera", { status: 502 });
  }
}
