import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getQuoteIdFromShareCode } from "@/lib/quotes/share-token";

const APP_BASE_PATH = "/go";

function withoutBasePath(pathname: string): string {
  if (pathname === APP_BASE_PATH) return "/";
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return pathname.slice(APP_BASE_PATH.length) || "/";
  }
  return pathname;
}

export async function proxy(request: NextRequest) {
  const pathname = withoutBasePath(request.nextUrl.pathname);

  if (pathname.startsWith("/o/")) {
    const shareCode = pathname.slice(3);
    const quoteId = getQuoteIdFromShareCode(shareCode);

    if (!quoteId) return NextResponse.next();

    const viewerUrl = new URL(
      `${APP_BASE_PATH}/compartilhar/orcamento/${quoteId}`,
      request.url,
    );
    viewerUrl.searchParams.set("token", shareCode);
    return NextResponse.rewrite(viewerUrl);
  }

  const publicPaths = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);
  const staticFileExtensions =
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|css|js|webmanifest)$/iu;
  const isPublic =
    publicPaths.has(pathname) ||
    pathname.startsWith("/o/") ||
    pathname.startsWith("/api/shared-quotes/") ||
    pathname.startsWith("/compartilhar/orcamento/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    staticFileExtensions.test(pathname) ||
    pathname === "/sw.js";

  if (isPublic) return NextResponse.next();

  const authToken = request.cookies.get("auth-token");
  if (authToken && (await verifyToken(authToken.value))) return NextResponse.next();

  const loginUrl = new URL(`${APP_BASE_PATH}/login`, request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
