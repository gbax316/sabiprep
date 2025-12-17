import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  canPerformDestructiveAction,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

/**
 * PUT /api/admin/questions/bulk
 * Bulk update status (publish, archive multiple questions)
 */
export async function PUT(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const body = await req.json();
      
      const { question_ids, action } = body;
      
      // Validate required fields
      if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Question IDs array is required');
      }
      
      if (!action || !['publish', 'archive', 'draft'].includes(action)) {
        return createErrorResponse(400, 'Bad Request', 'Valid action (publish, archive, draft) is required');
      }
      
      // Map action to status
      const statusMap: Record<string, string> = {
        publish: 'published',
        archive: 'archived',
        draft: 'draft',
      };
      
      const newStatus = statusMap[action];
      
      // Verify all questions exist
      const { data: existingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, status')
        .in('id', question_ids);
      
      if (fetchError) {
        console.error('Error fetching questions:', fetchError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch questions');
      }
      
      const existingIds = new Set(existingQuestions?.map(q => q.id) || []);
      const notFoundIds = question_ids.filter((id: string) => !existingIds.has(id));
      
      if (notFoundIds.length > 0) {
        return createErrorResponse(400, 'Bad Request', `Some questions not found: ${notFoundIds.join(', ')}`);
      }
      
      // Perform bulk update
      const { data: updatedQuestions, error: updateError } = await supabase
        .from('questions')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', question_ids)
        .select('id');
      
      if (updateError) {
        console.error('Error bulk updating questions:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to update questions');
      }
      
      const affected = updatedQuestions?.length || 0;
      
      // Log the action
      const auditAction = action === 'publish' ? 'BULK_PUBLISH' : 
                         action === 'archive' ? 'BULK_ARCHIVE' : 'UPDATE';
      
      await logAdminAction({
        admin_id: adminUser.id,
        action: auditAction,
        entity_type: 'question',
        details: {
          question_ids,
          new_status: newStatus,
          affected_count: affected,
        },
      }, req);
      
      return createSuccessResponse({
        success: true,
        affected,
        message: `Successfully ${action}ed ${affected} question(s)`,
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/questions/bulk:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * DELETE /api/admin/questions/bulk
 * Bulk archive (soft delete) questions
 */
export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can bulk delete
      if (!canPerformDestructiveAction(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can bulk delete questions');
      }
      
      const supabase = await createServerClient();
      const body = await req.json();
      
      const { question_ids } = body;
      
      // Validate required fields
      if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Question IDs array is required');
      }
      
      // Verify all questions exist
      const { data: existingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, status')
        .in('id', question_ids);
      
      if (fetchError) {
        console.error('Error fetching questions:', fetchError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch questions');
      }
      
      const existingIds = new Set(existingQuestions?.map(q => q.id) || []);
      const notFoundIds = question_ids.filter((id: string) => !existingIds.has(id));
      
      if (notFoundIds.length > 0) {
        return createErrorResponse(400, 'Bad Request', `Some questions not found: ${notFoundIds.join(', ')}`);
      }
      
      // Soft delete by archiving
      const { data: archivedQuestions, error: archiveError } = await supabase
        .from('questions')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .in('id', question_ids)
        .select('id');
      
      if (archiveError) {
        console.error('Error bulk archiving questions:', archiveError);
        return createErrorResponse(500, 'Database Error', 'Failed to archive questions');
      }
      
      const affected = archivedQuestions?.length || 0;
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'BULK_DELETE',
        entity_type: 'question',
        details: {
          question_ids,
          affected_count: affected,
          soft_deleted: true,
        },
      }, req);
      
      return createSuccessResponse({
        success: true,
        affected,
        message: `Successfully archived ${affected} question(s)`,
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/questions/bulk:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
