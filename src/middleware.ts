import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/register", "/", "/library/vr-tour"];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || ""
);

export async function middleware(request: NextRequest) {
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
      return response;
    }

    return NextResponse.next();
  } catch (err: any) {
    const loginUrl = new URL("/login", request.url);
    if (err.code === "ERR_JWT_EXPIRED") {
      loginUrl.searchParams.set("reason", "token-expired");
    } else {
      loginUrl.searchParams.set("reason", "invalid-token");
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|VRLIB/).*)"],
};
