import { NextResponse } from "next/server";

/**
 * Optimistic session check.
 *
 * Route handlers and Server Components perform the authoritative session
 * validation (signature + expiry) - this proxy only avoids flashing the
 * login screen to unauthenticated visitors and vice versa.
 */
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("hms_session")?.value);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession && pathname === "/login") {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)).*)",
  ],
};
