/**
 * GET /api/download/apk
 *
 * Stream APK file từ GitHub Releases qua Vercel Edge Runtime.
 *
 * TẠI SAO STREAM thay vì redirect 302?
 * ─────────────────────────────────────
 * Chrome Android bỏ qua thuộc tính `download` trên <a> tag khi URL cuối cùng
 * là cross-origin (ví dụ: GitHub CDN). Với redirect 302, browser follow sang
 * GitHub CDN (cross-origin), lấy Content-Type từ response đó (application/octet-stream)
 * rồi không nhận ra là APK → báo "Định dạng tập tin không được hỗ trợ".
 *
 * Với streaming: response đến từ CÙNG ORIGIN (vercel.app), `download` attribute
 * có hiệu lực, Content-Type và Content-Disposition do ta kiểm soát hoàn toàn.
 *
 * Vercel Edge Runtime hỗ trợ streaming response không giới hạn kích thước body.
 */
export const runtime = "edge";

const APK_GITHUB_URL =
  "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/latest/download/LibraryMobileApp.apk";

const APK_FILE_NAME = "LibraryMobileApp.apk";

export async function GET() {
  try {
    const upstream = await fetch(APK_GITHUB_URL, {
      redirect: "follow",
      // Cache lại ở edge 1 tiếng để giảm tải GitHub
      // (file APK chỉ thay đổi khi có release mới)
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: `GitHub trả về lỗi ${upstream.status}. Vui lòng thử lại sau.`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Lấy kích thước file từ GitHub để trình duyệt hiện progress bar
    const contentLength = upstream.headers.get("content-length");

    const responseHeaders = new Headers({
      // ✅ MIME type chính xác của APK — Android dùng cái này để khởi chạy installer
      "Content-Type": "application/vnd.android.package-archive",
      // ✅ Báo browser lưu file, không mở xem
      "Content-Disposition": `attachment; filename="${APK_FILE_NAME}"`,
      // Cache phía browser 1 tiếng
      "Cache-Control": "public, max-age=3600",
    });

    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    // Stream body trực tiếp — Edge Runtime pipe không giới hạn kích thước
    return new Response(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Lỗi kết nối: ${message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
