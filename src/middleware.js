import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith('/api/');
  const isPublicPath = path === '/login' || path === '/register' || path === '/api/login' || path === '/api/register';

  const tokenCookie = request.cookies.get('mylogintoken')?.value || "";

  let userRole = null;
  try {
    if (tokenCookie) {
      const parsedCookie = JSON.parse(tokenCookie);
      userRole = parsedCookie.role;
    }
  } catch (error) {
    console.error("Failed to parse token cookie:", error);
  }

  if (isPublicPath && tokenCookie) {
    if (isApiRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicPath && !tokenCookie) {
    if (isApiRoute) {
      return NextResponse.json(
        { message: 'Unauthorized: No authentication token provided' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path === '/product' && userRole !== 'manager') {
    if (isApiRoute) {
      return NextResponse.json(
        { message: 'Forbidden: You do not have permission to access this resource' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/access-denied', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/product",
    "/dashboard",
    "/access-denied",
    "/profile",
    "/receipts",
    "/deliveries",
    "/transfers",
    "/adjustments",
    "/moves",
    "/settings",
    "/api/:path*",
  ],
};
