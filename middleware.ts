import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware for protecting admin routes and handling authentication
 * 
 * This middleware:
 * 1. Protects all /admin/* routes except /admin/login
 * 2. Checks for admin/tutor role before allowing access
 * 3. Redirects unauthorized users appropriately
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Check if it's an admin route
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin');
  const isAdminLoginPage = pathname === '/admin/login';

  // Skip middleware for admin login page
  if (isAdminLoginPage) {
    // If already authenticated as admin, redirect to dashboard
    if (session) {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (user && ['admin', 'tutor'].includes(user.role)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
    return response;
  }

  // Protect admin routes and admin API routes
  if (isAdminRoute || isAdminApiRoute) {
    // No session - redirect to login or return 401 for API
    if (!session) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Check if user has admin role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', session.user.id)
      .single();

    // User not found or error
    if (userError || !user) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: 'Not Found', message: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Check if user is suspended
    if (user.status === 'suspended' || user.status === 'deleted') {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Account is suspended' },
          { status: 403 }
        );
      }
      // Sign out and redirect to login
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/admin/login?error=suspended', request.url));
    }

    // Check if user has admin or tutor role
    if (!['admin', 'tutor'].includes(user.role)) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        );
      }
      // Redirect to main app home page
      return NextResponse.redirect(new URL('/home', request.url));
    }

    // User is authorized - continue
    return response;
  }

  // For non-admin routes, just continue
  return response;
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
  matcher: [
    // Match admin routes
    '/admin/:path*',
    // Match admin API routes
    '/api/admin/:path*',
  ],
};
