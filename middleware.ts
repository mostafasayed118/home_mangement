import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, validateProductionJwtSecret } from "./lib/jwt";

// Public routes that don't require authentication
// Include all auth pages, API routes, static files, etc.
const publicRoutes = [
  '/sign-in',
  '/sign-up', 
  '/verify-email',
  '/reset-password',
  '/forgot-password',
];

// Routes that start with these prefixes are always public
const publicPrefixes = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/public/',
];

// Check if a path is a public route
function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true;
  }
  
  // Check prefix matches
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return true;
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the auth token from cookies
  const token = request.cookies.get("auth_token")?.value;
  
  // Check if this is a public path
  const isPublic = isPublicPath(pathname);
  
  // If it's a public path, allow access without checking auth
  if (isPublic) {
    // Special case: If authenticated user visits sign-in, redirect to dashboard
    if (pathname === '/sign-in' && token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }
  
  // For protected routes: check if user has a valid token
  if (!token) {
    // No token - redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Token exists - verify it
  const payload = await verifyToken(token);
  if (!payload) {
    // Token is invalid or expired, redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.delete("auth_token");
    return response;
  }
  
  // Valid token - allow access
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
