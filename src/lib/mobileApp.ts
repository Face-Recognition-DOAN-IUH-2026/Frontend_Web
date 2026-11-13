/**
 * Single source of truth for the IUH Library mobile app download.
 *
 * The APK is hosted as a GitHub Release asset instead of an EAS build artifact:
 * EAS deletes build artifacts after 30 days, so an artifact URL is not a stable
 * download link for end users. `releases/latest/download/<file>` always points at
 * the asset attached to the most recent release, so shipping v1.0.1 only requires
 * uploading a new release with the same file name.
 */
export const MOBILE_APP = {
  apkUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases/latest/download/LibraryMobileApp.apk",
  releasesUrl:
    "https://github.com/Face-Recognition-DOAN-IUH-2026/Frontend_mobile/releases",
  fileName: "LibraryMobileApp.apk",
  version: "1.0.0",
  sizeLabel: "197 MB",
  minAndroid: "7.0",
} as const;
