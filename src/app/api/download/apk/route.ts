import { NextRequest } from "next/server";
import { MOBILE_APP } from "@/lib/mobileApp";

interface AndroidReleaseManifest {
  version?: string;
  download_url?: string;
}

async function resolveLatestApk(): Promise<{
  version: string;
  downloadUrl: string;
  fileName: string;
}> {
  try {
    const res = await fetch(MOBILE_APP.manifestUrl, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as AndroidReleaseManifest;
      if (data.download_url) {
        const version = data.version || MOBILE_APP.version;
        const urlParts = data.download_url.split("/");
        const fileName = urlParts[urlParts.length - 1] || `ThuVien-v${version}.apk`;
        return {
          version,
          downloadUrl: data.download_url,
          fileName,
        };
      }
    }
  } catch {
    // Fallback to static config when GitHub manifest is temporarily unreachable
  }

  return {
    version: MOBILE_APP.version,
    downloadUrl: MOBILE_APP.apkUrl,
    fileName: MOBILE_APP.fileName,
  };
}

/**
 * GET /api/download/apk
 * - ?meta=1: trả JSON metadata phiên bản mới nhất (tránh CORS ở client).
 * - Mặc định: redirect 307 sang URL file APK mới nhất trên GitHub Releases CDN.
 */
export async function GET(req: NextRequest) {
  const latest = await resolveLatestApk();

  if (req.nextUrl.searchParams.get("meta") === "1") {
    return Response.json(latest, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  }

  return Response.redirect(latest.downloadUrl, 307);
}
