import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/"];

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeTokenPayload(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "invalid-token");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  if (payload.exp && typeof payload.exp === "number") {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "token-expired");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("access_token");
      return response;
    }
  }

  const role = (payload.roles as string[])?.[0] || (payload.role as string) || null;
  if (role !== "admin" && role !== "staff") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "staff-only");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
