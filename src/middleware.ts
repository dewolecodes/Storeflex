import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protect admin, dashboard and merchant routes and attach tenant context from JWT
export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Paths we want to protect
    const protectedPaths = ['/admin', '/dashboard', '/merchant'];
    const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

    if (!isProtected) return NextResponse.next();

    // Read the NextAuth JWT from the request (this does not require DB access)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        // Redirect to login and preserve the requested path for post-login redirect
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    // If this is a merchant/dashboard area, ensure tenantId exists on the token
    if ((pathname === '/dashboard' || pathname.startsWith('/dashboard/')) || (pathname === '/merchant' || pathname.startsWith('/merchant/'))) {
        if (!token.tenantId) {
            const registerUrl = new URL('/register', req.url);
            return NextResponse.redirect(registerUrl);
        }
    }

    // Allow the request to proceed
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*', '/merchant/:path*'],
};
