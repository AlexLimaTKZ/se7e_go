import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);
  const staticFileExtensions =
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|css|js|webmanifest)$/iu;
  const isPublic =
    publicPaths.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    staticFileExtensions.test(pathname) ||
    pathname === "/sw.js";

  if (isPublic) return NextResponse.next();

  const authToken = request.cookies.get("auth-token");
  if (authToken && (await verifyToken(authToken.value))) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
