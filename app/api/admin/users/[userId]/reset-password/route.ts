import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  isAdminOnly,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/reset-password
 * Trigger password reset email for user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can reset passwords
      if (!isAdminOnly(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can reset user passwords');
      }
      
      const { userId } = await params;
      const supabase = await createServerClient();
      
      // Fetch user to get email
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, email, full_name, status')
        .eq('id', userId)
        .single();
      
      if (fetchError || !user) {
        return createErrorResponse(404, 'Not Found', 'User not found');
      }
      
      // Check if user is active
      if (user.status === 'suspended' || user.status === 'deleted') {
        return createErrorResponse(400, 'Bad Request', 'Cannot reset password for inactive user');
      }
      
      // Get optional redirect URL from body
      const body = await req.json().catch(() => ({}));
      const redirectTo = body.redirectTo || `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`;
      
      // Use Supabase Admin API to send password reset email
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
        return createErrorResponse(500, 'Configuration Error', 'Password reset is not configured');
      }
      
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Send password reset email
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo,
        }
      );
      
      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        return createErrorResponse(500, 'Auth Error', 'Failed to send password reset email');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'user',
        entity_id: userId,
        details: {
          action_type: 'password_reset_triggered',
          user_email: user.email,
          user_name: user.full_name,
        },
      }, req);
      
      return createSuccessResponse({
        message: 'Password reset email sent successfully',
        email: user.email,
      });
    } catch (error) {
      console.error('Error in POST /api/admin/users/[userId]/reset-password:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  }, ['admin']); // Only admins
}
