import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/", "/library/vr-tour"];

const rawSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
const rawRefreshSecret = process.env.JWT_REFRESH_SECRET || rawSecret;
const JWT_SECRET = new TextEncoder().encode(rawSecret);
const JWT_REFRESH_SECRET = new TextEncoder().encode(rawRefreshSecret);

export async function proxy(request: NextRequest) {
  if (!rawSecret) {
    return new NextResponse(JSON.stringify({ error: "Server misconfigured: JWT secret not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const path = request.nextUrl.pathname;

  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!token && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // 1. First check access_token
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER || undefined,
        audience: process.env.JWT_AUDIENCE || undefined,
      });

      const role =
        (payload.roles as string[])?.[0] ||
        (payload.role as string) ||
        null;
      if (role !== "admin" && role !== "staff") {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("reason", "staff-only");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
      }

      return NextResponse.next();
    } catch {
      // Access token expired or invalid: fall through to check refresh_token
    }
  }

  // 2. If access_token is expired or missing, check refresh_token
  if (refreshToken) {
    try {
      const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER || undefined,
        audience: process.env.JWT_AUDIENCE || undefined,
      });

      const role =
        (payload.roles as string[])?.[0] ||
        (payload.role as string) ||
        null;
      if (role !== "admin" && role !== "staff") {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("reason", "staff-only");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
      }

      // Valid refresh_token! Allow page to load so client-side AuthProvider can silently refresh access_token
      return NextResponse.next();
    } catch {
      // Both access_token and refresh_token are invalid
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", path);
  loginUrl.searchParams.set("reason", "session-expired");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static, _next/image (Next.js internals)
     * - static files with extensions (.png, .jpg, .jpeg, .svg, .ico, .webp, .mp4, etc.)
     * - VRLIB (VR Tour assets)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)|VRLIB/).*)",
  ],
};

export const middleware = proxy;


