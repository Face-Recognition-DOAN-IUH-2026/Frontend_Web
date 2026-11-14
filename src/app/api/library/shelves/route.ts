import { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:80").replace(/\/api\/?$/, "").replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/api/library/shelves`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return Response.json({ error: "Không thể kết nối backend" }, { status: 502 });
  }
}
