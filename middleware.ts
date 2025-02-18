import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Middleware triggered for pathname:', pathname);

  // Allow public access to /auth/register
  if (pathname === '/auth/register') {
    console.log('Allowing access to /auth/register');
    return NextResponse.next();
  }

  // Example: protect any /auth route (except those explicitly allowed)
  if (pathname.startsWith('/auth') && !request.cookies.get("next-auth.session-token")) {
    console.log(`Redirecting ${pathname} to /auth/login`);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

