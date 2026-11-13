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
  /** URL proxy nội bộ — dùng cho nút Tải APK để fix lỗi MIME trên Android */
  apkDownloadUrl: "/api/download/apk",
  /** URL GitHub gốc — dùng cho QR code và link dự phòng */
  apkUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/latest/download/LibraryMobileApp.apk",
  releasesUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases",
  fileName: "LibraryMobileApp.apk",
  version: "1.0.0",
  sizeLabel: "197 MB",
  minAndroid: "7.0",
} as const;
