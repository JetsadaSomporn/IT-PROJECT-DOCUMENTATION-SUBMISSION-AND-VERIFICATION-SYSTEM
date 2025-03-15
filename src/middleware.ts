import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // You could add authentication checks or other middleware logic here
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
