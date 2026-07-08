import type { AccessLogPublic } from "../types";

let _accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  _accessToken = token;
}

export function getApiAccessToken(): string | null {
  return _accessToken;
}

export function normalizeAccessLog(log: any): AccessLogPublic {
  const user = log?.user || {};
  return {
    ...log,
    patron_id: log?.patron_id || log?.patronId || user.id || null,
    patron_name: log?.patron_name || log?.full_name || log?.fullName || user.full_name || user.fullName || null,
    student_code: log?.student_code || log?.studentCode || user.student_code || user.studentCode || null,
    access_type: log?.access_type || log?.accessType || "",
    verify_method: log?.verify_method || log?.verifyMethod || "face",
    confidence: log?.confidence ?? null,
    camera_id: log?.camera_id || log?.cameraId || "",
    access_time: log?.access_time || log?.accessTime || log?.created_at || log?.createdAt || "",
    status: log?.status === "granted" ? "success" : (log?.status || ""),
  };
}

export function setStoredAccessToken(token: string) {
  _accessToken = token;
  setAccessTokenCookie(token);
}

export function clearStoredAuth() {
  _accessToken = null;
  clearAccessTokenCookie();
  if (typeof window !== "undefined") {
    document.cookie = "refresh_token=; path=/; max-age=0";
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  return Date.now() >= (exp - skewSeconds) * 1000;
}

export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAccessTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "; Secure" : "";
  document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
}

export function clearAccessTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "access_token=; path=/; max-age=0";
}

export function getErrorMessage(err: any): string {
  if (!err) return "Lỗi không xác định";
  if (typeof err === "string") return err;
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) =>
        typeof d === "string" ? d : `${d.loc?.join(".")}: ${d.msg}`
      ).join("; ");
    }
    if (typeof detail === "object") {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
  }
  if (err.response?.data?.error) {
    const errorVal = err.response.data.error;
    if (typeof errorVal === "string") return errorVal;
    if (typeof errorVal === "object") return errorVal.msg || errorVal.message || JSON.stringify(errorVal);
  }
  return err.message || err.msg || String(err);
}

// Convenience functions that delegate to the ApiClient singleton.
// Uses dynamic import to avoid circular dependency with ./client.
export function retryPendingRequests(token: string) {
  import("./client").then((m) => m.api.retryPendingRequests(token));
}
export function cancelPendingRequests() {
  import("./client").then((m) => m.api.cancelPendingRequests());
}
