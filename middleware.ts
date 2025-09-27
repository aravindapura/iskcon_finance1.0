import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n/settings";

const PUBLIC_FILE = /\.(?:.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pathnameIsMissingLocale = locales.every((locale) => {
    const normalized = pathname === "/" ? "" : pathname;
    return !normalized.startsWith(`/${locale}`);
  });

  if (pathnameIsMissingLocale) {
    const redirectURL = new URL(
      `/${defaultLocale}${pathname === "/" ? "" : pathname}`,
      request.url
    );

    return NextResponse.redirect(redirectURL);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)"]
};
