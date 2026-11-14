/**
 * GET /api/download/apk
 *
 * Redirect người dùng sang URL GitHub Release mới nhất.
 *
 * TẠI SAO REDIRECT 307 THAY VÌ STREAM QUA VERCEL?
 * ──────────────────────────────────────────────
 * File APK có dung lượng ~197 MB. Nếu proxy qua Vercel Edge:
 * - Vercel Edge có timeout thực thi (25-30 giây). Người dùng mạng 4G hoặc wifi
 *   chậm sẽ bị cắt giữa chừng, file tải về chỉ được vài chục MB (bị hỏng / corrupt).
 * - Khi mở file APK bị corrupt, Android sẽ báo: "Định dạng tập tin không được hỗ trợ".
 *
 * Chuyển hướng 307 sang GitHub Release CDN (Azure Blob Storage Singapore):
 * - Phản hồi tức thì (<50ms).
 * - CDN của GitHub hỗ trợ Range Requests (tải đa luồng, pause/resume).
 * - Trả về đầy đủ header Content-Disposition: attachment; filename=LibraryMobileApp.apk
 *   và Content-Type: application/vnd.android.package-archive.
 */
const APK_GITHUB_URL =
  "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/latest/download/LibraryMobileApp.apk";

export async function GET() {
  return Response.redirect(APK_GITHUB_URL, 307);
}
