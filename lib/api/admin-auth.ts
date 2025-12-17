import { createServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types/database';
import type { AuditAction, AuditEntityType, AuditLogEntry } from '@/types/admin';

/**
 * Admin role type (for API authentication)
 */
export type AdminRole = 'admin' | 'tutor';

/**
 * Admin user type (minimal data for API context)
 */
export interface AdminApiUser {
  id: string;
  email: string;
  role: AdminRole;
  full_name: string;
}

/**
 * API route handler type with admin context
 */
export type AdminApiHandler = (
  user: AdminApiUser,
  request: NextRequest
) => Promise<NextResponse>;

/**
 * Verify if the current user has admin role
 * Server-side function to check admin status
 */
export async function verifyAdminRole(): Promise<{
  isAdmin: boolean;
  user?: AdminApiUser;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { isAdmin: false, error: 'Unauthorized: No active session' };
    }
    
    // Fetch user role from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !user) {
      return { isAdmin: false, error: 'User not found' };
    }
    
    // Check if user has admin or tutor role
    if (!['admin', 'tutor'].includes(user.role)) {
      return { isAdmin: false, error: 'Forbidden: Admin access required' };
    }
    
    return {
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as AdminRole,
        full_name: user.full_name,
      },
    };
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return { isAdmin: false, error: 'Internal server error' };
  }
}

/**
 * Wrapper for admin-protected API routes
 * Verifies admin role before executing the handler
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: AdminApiHandler,
  allowedRoles: AdminRole[] = ['admin', 'tutor']
): Promise<NextResponse> {
  try {
    console.log('[DEBUG] withAdminAuth: Starting authentication check for', request.url)
    const supabase = await createServerClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[DEBUG] withAdminAuth: Session check result:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id
    })
    
    if (sessionError || !session) {
      console.log('[DEBUG] withAdminAuth: Authentication failed - no session')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No active session' },
        { status: 401 }
      );
    }
    
    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', session.user.id)
      .single();
    
    console.log('[DEBUG] withAdminAuth: User lookup result:', {
      hasUser: !!user,
      userError: userError?.message,
      userRole: user?.role
    })
    
    if (userError || !user) {
      console.log('[DEBUG] withAdminAuth: User not found in database')
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check role
    if (!allowedRoles.includes(user.role as AdminRole)) {
      console.log('[DEBUG] withAdminAuth: Insufficient permissions. User role:', user.role, 'Allowed:', allowedRoles)
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    console.log('[DEBUG] withAdminAuth: Authentication successful for user:', user.email)
    
    // Execute handler with admin user context
    return handler(
      {
        id: user.id,
        email: user.email,
        role: user.role as AdminRole,
        full_name: user.full_name,
      },
      request
    );
  } catch (error) {
    console.error('[DEBUG] withAdminAuth: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to create admin-only route handler
 */
export function createAdminRoute(handler: AdminApiHandler): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) => withAdminAuth(request, handler, ['admin']);
}

/**
 * Helper function to create admin/tutor route handler
 */
export function createAdminOrTutorRoute(handler: AdminApiHandler): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) => withAdminAuth(request, handler, ['admin', 'tutor']);
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  entry: Omit<AuditLogEntry, 'admin_id'> & { admin_id?: string },
  request?: NextRequest
): Promise<void> {
  try {
    const supabase = await createServerClient();
    
    // If admin_id is not provided, try to get it from the current session
    let adminId = entry.admin_id;
    
    if (!adminId) {
      const { data: { session } } = await supabase.auth.getSession();
      adminId = session?.user?.id;
    }
    
    if (!adminId) {
      console.error('Cannot log admin action: No admin ID available');
      return;
    }
    
    // Extract IP and user agent from request if available
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] 
      || request?.headers.get('x-real-ip')
      || entry.ip_address
      || null;
    const userAgent = request?.headers.get('user-agent') || entry.user_agent || null;
    
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      details: entry.details || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    // Don't throw - audit logging should not block operations
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Get request metadata for audit logging
 */
export function getRequestMetadata(request: NextRequest): {
  ip_address?: string;
  user_agent?: string;
} {
  return {
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] 
      || request.headers.get('x-real-ip')
      || undefined,
    user_agent: request.headers.get('user-agent') || undefined,
  };
}

/**
 * Helper to verify specific role (admin only operations)
 */
export function isAdminOnly(user: AdminApiUser): boolean {
  return user.role === 'admin';
}

/**
 * Helper to check if user can perform destructive operations
 * Only admins can delete, tutors can only create/update
 */
export function canPerformDestructiveAction(user: AdminApiUser): boolean {
  return user.role === 'admin';
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  status: number,
  error: string,
  message?: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { 
      error, 
      message: message || error,
      ...(details && { details })
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}
