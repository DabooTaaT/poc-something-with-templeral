import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This proxy runs on the Edge runtime (replaces middleware in Next.js 16+)
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add custom headers to all responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add timestamp header
  response.headers.set('X-Response-Time', new Date().toISOString());

  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Proxy] ${request.method} ${request.url}`);
  }

  return response;
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

