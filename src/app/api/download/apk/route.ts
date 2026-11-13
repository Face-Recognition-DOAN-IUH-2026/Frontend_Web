import { NextResponse } from "next/server";
import { MOBILE_APP } from "@/lib/mobileApp";

/**
 * GET /api/download/apk
 *
 * Proxy APK từ GitHub Releases với đúng MIME type và Content-Disposition header
 * để Chrome/WebView trên Android nhận ra đây là file cần lưu về máy,
 * tránh lỗi "Định dạng tập tin không được hỗ trợ".
 *
 * Vercel Serverless Function có giới hạn response body 4.5 MB mặc định,
 * nhưng với Vercel Pro/Enterprise thì lớn hơn. Với APK ~197 MB,
 * chúng ta dùng redirect 302 kèm headers gợi ý thay vì stream toàn bộ file,
 * vì GitHub đã serve file với đúng Content-Type khi truy cập trực tiếp.
 *
 * Nếu muốn stream thực sự (cần Edge Runtime hoặc server riêng), xem comment cuối file.
 */
export const runtime = "edge";

export async function GET() {
  try {
    // Fetch HEAD trước để lấy URL thực sau redirect của GitHub
    const headRes = await fetch(MOBILE_APP.apkUrl, {
      method: "HEAD",
      redirect: "follow",
    });

    const resolvedUrl = headRes.url; // URL thực sau tất cả redirect

    // Trả về redirect đến URL thực (đã resolved) với header đúng
    // Dùng 302 để browser luôn fetch lại (không cache redirect)
    return NextResponse.redirect(resolvedUrl, {
      status: 302,
      headers: {
        // Báo cho browser đây là file cần download, không phải mở xem
        "Content-Disposition": `attachment; filename="${MOBILE_APP.fileName}"`,
        // MIME type chính xác cho APK — Android dùng cái này để nhận diện
        "Content-Type": "application/vnd.android.package-archive",
        // Không cache redirect — luôn lấy URL mới nhất từ GitHub
        "Cache-Control": "no-store",
        // Cho phép trình duyệt mobile truy cập
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể kết nối đến máy chủ tải APK. Vui lòng thử lại." },
      { status: 502 }
    );
  }
}

/*
 * === GHI CHÚ KỸ THUẬT ===
 *
 * Tại sao redirect thay vì stream?
 * - APK ~197 MB vượt giới hạn Vercel Serverless (4.5 MB response).
 * - GitHub serve file với Content-Type đúng khi URL đã resolved (sau redirect).
 * - Redirect đến URL thực (không phải /releases/latest/download/...) tránh được
 *   vấn đề Chrome Android xử lý redirect chain không nhận ra APK.
 *
 * Nếu muốn stream thực sự (bypass mọi vấn đề MIME):
 *   const upstream = await fetch(MOBILE_APP.apkUrl, { redirect: "follow" });
 *   return new Response(upstream.body, {
 *     headers: {
 *       "Content-Type": "application/vnd.android.package-archive",
 *       "Content-Disposition": `attachment; filename="${MOBILE_APP.fileName}"`,
 *       "Content-Length": upstream.headers.get("content-length") ?? "",
 *     },
 *   });
 * → Chỉ dùng được trên server có RAM đủ lớn / Edge Runtime với body size không giới hạn.
 */
