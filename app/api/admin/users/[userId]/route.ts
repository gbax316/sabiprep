import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  isAdminOnly,
  canPerformDestructiveAction,
  type AdminApiUser 
} from '@/lib/api/admin-auth';
import type { UserRole, UserStatus } from '@/types/database';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get single user details with stats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { userId } = await params;
      const supabase = await createServerClient();
      
      // Fetch user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        return createErrorResponse(404, 'Not Found', 'User not found');
      }
      
      // Fetch user stats - sessions count
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, correct_answers, questions_answered, status, score_percentage', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      // Calculate stats
      let totalSessions = 0;
      let totalQuestionsAnswered = 0;
      let totalCorrectAnswers = 0;
      let averageAccuracy = 0;
      
      if (sessions && sessions.length > 0) {
        totalSessions = sessions.length;
        sessions.forEach((session) => {
          totalQuestionsAnswered += session.questions_answered || 0;
          totalCorrectAnswers += session.correct_answers || 0;
        });
        averageAccuracy = totalQuestionsAnswered > 0 
          ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) 
          : 0;
      }
      
      // Fetch recent activity from audit logs
      const { data: recentActivity } = await supabase
        .from('admin_audit_logs')
        .select('id, action, entity_type, details, created_at')
        .eq('entity_id', userId)
        .eq('entity_type', 'user')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Fetch role change history from audit logs
      const { data: roleHistory } = await supabase
        .from('admin_audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          admin_id
        `)
        .eq('entity_id', userId)
        .eq('entity_type', 'user')
        .in('action', ['ROLE_CHANGE', 'STATUS_CHANGE', 'CREATE'])
        .order('created_at', { ascending: false });
      
      return NextResponse.json({
        success: true,
        user,
        stats: {
          totalSessions,
          totalQuestionsAnswered,
          totalCorrectAnswers,
          averageAccuracy,
          // From user record
          streakCount: user.streak_count || 0,
          totalStudyTimeMinutes: user.total_study_time_minutes || 0,
        },
        recentActivity: recentActivity || [],
        roleHistory: roleHistory || [],
      });
    } catch (error) {
      console.error('Error in GET /api/admin/users/[userId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * PUT /api/admin/users/[userId]
 * Update user (role, status, profile)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { userId } = await params;
      const supabase = await createServerClient();
      const body = await req.json();
      
      const { full_name, role, status, grade, phone, institution, avatar_url } = body;
      
      // Fetch current user
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (fetchError || !currentUser) {
        return createErrorResponse(404, 'Not Found', 'User not found');
      }
      
      // Check permissions for role changes
      if (role && role !== currentUser.role) {
        // Only admins can change roles
        if (!isAdminOnly(adminUser)) {
          return createErrorResponse(403, 'Forbidden', 'Only admins can change user roles');
        }
        
        // Prevent demoting self
        if (userId === adminUser.id && role !== 'admin') {
          return createErrorResponse(400, 'Bad Request', 'You cannot demote yourself');
        }
      }
      
      // Build update object
      const updateData: Record<string, unknown> = {};
      
      if (full_name !== undefined) updateData.full_name = full_name;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (grade !== undefined) updateData.grade = grade;
      if (phone !== undefined) updateData.phone = phone;
      if (institution !== undefined) updateData.institution = institution;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      // Perform update
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to update user');
      }
      
      // Log role change specifically
      if (role && role !== currentUser.role) {
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'ROLE_CHANGE',
          entity_type: 'user',
          entity_id: userId,
          details: {
            previous_role: currentUser.role,
            new_role: role,
            user_email: currentUser.email,
          },
        }, req);
      }
      
      // Log status change specifically
      if (status && status !== currentUser.status) {
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'STATUS_CHANGE',
          entity_type: 'user',
          entity_id: userId,
          details: {
            previous_status: currentUser.status,
            new_status: status,
            user_email: currentUser.email,
          },
        }, req);
      }
      
      // Log general update
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'user',
        entity_id: userId,
        details: {
          updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
          user_email: currentUser.email,
        },
      }, req);
      
      return createSuccessResponse({
        user: updatedUser,
        message: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/users/[userId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * DELETE /api/admin/users/[userId]
 * Soft delete user (set status to inactive)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can delete users
      if (!canPerformDestructiveAction(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can delete users');
      }
      
      const { userId } = await params;
      const supabase = await createServerClient();
      
      // Prevent self-deletion
      if (userId === adminUser.id) {
        return createErrorResponse(400, 'Bad Request', 'You cannot delete your own account');
      }
      
      // Fetch current user
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('id, email, full_name, role, status')
        .eq('id', userId)
        .single();
      
      if (fetchError || !currentUser) {
        return createErrorResponse(404, 'Not Found', 'User not found');
      }
      
      // Prevent deletion of other admins (only super admin can do this)
      if (currentUser.role === 'admin') {
        return createErrorResponse(403, 'Forbidden', 'Cannot delete admin users through API');
      }
      
      // Soft delete - set status to 'deleted' (or 'inactive' based on schema)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          status: 'suspended', // Using suspended as soft delete
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error deleting user:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to delete user');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'user',
        entity_id: userId,
        details: {
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          previous_status: currentUser.status,
          soft_delete: true,
        },
      }, req);
      
      return createSuccessResponse({
        message: 'User deactivated successfully',
        userId,
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/users/[userId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  }, ['admin']); // Only admins
}
