import { NextRequest, NextResponse } from 'next/server';

// Redirect /register to /signup (register is a common alias)
const redirects: Record<string, string> = {
  '/register': '/signup',
};

export function middleware(request: NextRequest) {
  const redirect = redirects[request.nextUrl.pathname];
  if (redirect) {
    const url = request.nextUrl.clone();
    url.pathname = redirect;
    return NextResponse.redirect(url);
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
