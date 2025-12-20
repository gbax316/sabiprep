// Bulk action on batch questions
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser, logAdminAction } from '@/lib/api/admin-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { reportId } = await context.params;
      const body = await req.json();
      
      const { action, questionIds } = body;
      
      // Validate action
      const validActions = ['publish', 'archive', 'draft', 'delete'];
      if (!validActions.includes(action)) {
        return NextResponse.json({
          error: 'Invalid action. Must be publish, archive, draft, or delete'
        }, { status: 400 });
      }
      
      // Validate report exists
      const { data: report, error: reportError } = await supabase
        .from('import_reports')
        .select('id, filename')
        .eq('id', reportId)
        .single();
      
      if (reportError || !report) {
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      // Build query - either specific questions or all in batch
      let query = supabase
        .from('questions')
        .select('id');
      
      if (questionIds && questionIds.length > 0) {
        // Specific questions
        query = query.in('id', questionIds);
      } else {
        // All questions in batch
        query = query.eq('import_report_id', reportId);
      }
      
      const { data: targetQuestions, error: fetchError } = await query;
      
      if (fetchError) {
        console.error('Error fetching questions:', fetchError);
        return NextResponse.json({
          error: 'Failed to fetch questions'
        }, { status: 500 });
      }
      
      if (!targetQuestions || targetQuestions.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No questions found to update',
          affected: 0
        });
      }
      
      const ids = targetQuestions.map(q => q.id);
      let affected = 0;
      
      if (action === 'delete') {
        // Hard delete questions
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          console.error('Error deleting questions:', deleteError);
          return NextResponse.json({
            error: 'Failed to delete questions'
          }, { status: 500 });
        }
        
        affected = ids.length;
      } else {
        // Update status
        const statusMap: Record<string, string> = {
          publish: 'published',
          archive: 'archived',
          draft: 'draft'
        };
        
        const { error: updateError } = await supabase
          .from('questions')
          .update({ 
            status: statusMap[action],
            updated_at: new Date().toISOString()
          })
          .in('id', ids);
        
        if (updateError) {
          console.error('Error updating questions:', updateError);
          return NextResponse.json({
            error: 'Failed to update questions'
          }, { status: 500 });
        }
        
        affected = ids.length;
      }
      
      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: action === 'delete' ? 'DELETE' : 'UPDATE',
        entity_type: 'question',
        entity_id: reportId,
        details: {
          bulk_action: action,
          batch_id: reportId,
          batch_filename: report.filename,
          affected_count: affected,
          question_ids: ids
        }
      }, req);
      
      return NextResponse.json({
        success: true,
        message: `Successfully ${action === 'delete' ? 'deleted' : action + 'ed'} ${affected} questions`,
        affected
      });
    } catch (error) {
      console.error('Error in POST /api/admin/import/reports/[reportId]/bulk-action:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
