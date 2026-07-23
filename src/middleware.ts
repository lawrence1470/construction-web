import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

function getSessionCookie(req: NextRequest) {
  const name = req.nextUrl.hostname === "localhost"
    ? "better-auth.session_token"
    : "__Secure-better-auth.session_token";
  return req.cookies.get(name);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Playwright test bypass
  if (
    request.headers.get("x-playwright-test") === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return NextResponse.next();
  }

  // No auth needed
  if (pathname.startsWith("/api") || pathname === "/" || pathname.startsWith("/invite")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Auth pages, verify-email, onboarding — always allow through
  // (middleware can't validate session, only check cookie existence —
  //  auth pages handle their own redirect if user is already signed in)
  if (isAuthPage || pathname.startsWith("/verify-email") || pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // Everything else requires a session cookie
  if (!sessionCookie) {
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${pathname}`, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|images|bryntum|pdf).*)",
  ],
};
