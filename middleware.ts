import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ['/sign-in', '/sign-up', '/verify'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the auth token from cookies - simple existence check only
  const token = request.cookies.get("auth_token")?.value;

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Scenario 1: User is on a public auth route (sign-in, sign-up, verify)
  // and already has a valid token → redirect to dashboard
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Scenario 2: User is on a protected route (dashboard, apartments, etc.)
  // and does NOT have a token → redirect to sign-in
  if (!isPublicRoute && !token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Scenario 3: User is on a public route without token → allow access
  // Scenario 4: User is on a protected route with token → allow access
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
