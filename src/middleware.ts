import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthPage = request.nextUrl.pathname.startsWith("/sign-in") ||
                     request.nextUrl.pathname.startsWith("/sign-up");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Allow API routes and auth pages without authentication
  if (isApiRoute || isAuthPage) {
    return NextResponse.next();
  }

  // Redirect to sign-in if no session cookie
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in?callbackUrl=" + request.nextUrl.pathname, request.url));
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
