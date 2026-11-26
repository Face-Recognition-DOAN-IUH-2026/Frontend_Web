/**
 * Single source of truth for the IUH Library mobile app download.
 *
 * The APK is hosted as a GitHub Release asset instead of an EAS build artifact:
 * EAS deletes build artifacts after 30 days, so an artifact URL is not a stable
 * download link for end users. `releases/latest/download/<file>` always points at
 * the asset attached to the most recent release, so shipping v1.0.1 only requires
 * uploading a new release with the same file name.
 *
 * apkDownloadUrl  — route nội bộ (/api/download/apk) trả về redirect với đúng
 *                   MIME type `application/vnd.android.package-archive` và header
 *                   Content-Disposition: attachment, giúp Chrome / WebView Android
 *                   nhận ra file APK thay vì báo "định dạng không được hỗ trợ".
 * apkUrl          — URL GitHub gốc (dùng cho QR code và fallback).
 */
export const MOBILE_APP = {
  /** URL proxy nội bộ — tự động redirect sang APK mới nhất từ latest_android.json */
  apkDownloadUrl: "/api/download/apk",
  /** Manifest OTA chuẩn trên GitHub Releases */
  manifestUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/download/latest-android/latest_android.json",
  /** URL GitHub fallback — dùng cho QR code khi chưa tải được manifest */
  apkUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/download/latest-android/ThuVien-v1.0.0.1.apk",
  releasesUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases",
  fileName: "ThuVien-v1.0.0.1.apk",
  version: "1.0.0.1",
  sizeLabel: "197 MB",
  minAndroid: "7.0",
} as const;
