import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isApiRoute = pathname.startsWith("/api");
  const isLandingPage = pathname === "/";

  // Allow API routes without authentication check
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages and landing page to dashboard
  if ((isAuthPage || isLandingPage) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow unauthenticated users to access auth pages and landing page
  if (isAuthPage || isLandingPage) {
    return NextResponse.next();
  }

  // Redirect to sign-in if no session cookie for protected routes
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in?callbackUrl=" + pathname, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
