// Import Report Detail Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';
import { logAdminAction } from '@/lib/api/admin-auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const supabase = await createServerClient();
      const { reportId } = await context.params;
      
      // Fetch report with admin details
      const { data: report, error: reportError } = await supabase
        .from('import_reports')
        .select(`
          id,
          admin_id,
          filename,
          file_size_bytes,
          total_rows,
          successful_rows,
          failed_rows,
          status,
          error_details,
          import_type,
          started_at,
          completed_at,
          created_at,
          users!admin_id(full_name, email)
        `)
        .eq('id', reportId)
        .single();
      
      if (reportError || !report) {
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        report: {
          id: report.id,
          admin_id: report.admin_id,
          filename: report.filename,
          file_size_bytes: report.file_size_bytes,
          total_rows: report.total_rows,
          successful_rows: report.successful_rows,
          failed_rows: report.failed_rows,
          status: report.status,
          error_details: report.error_details,
          import_type: report.import_type,
          started_at: report.started_at,
          completed_at: report.completed_at,
          created_at: report.created_at,
          admin: report.users
        }
      });
    } catch (error) {
      console.error('Error in GET /api/admin/import/reports/:reportId:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { reportId } = await context.params;
      const body = await req.json();
      
      // Validate report exists
      const { data: existingReport, error: fetchError } = await supabase
        .from('import_reports')
        .select('id, filename, status')
        .eq('id', reportId)
        .single();
      
      if (fetchError || !existingReport) {
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      // Prepare update data (only allow updating certain fields)
      const updateData: Record<string, any> = {};
      
      if (body.filename !== undefined) {
        updateData.filename = body.filename;
      }
      
      if (body.status !== undefined && ['pending', 'processing', 'completed', 'failed'].includes(body.status)) {
        updateData.status = body.status;
      }
      
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({
          error: 'No valid fields to update'
        }, { status: 400 });
      }
      
      // Update report
      const { data: updatedReport, error: updateError } = await supabase
        .from('import_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating import report:', updateError);
        return NextResponse.json({
          error: 'Failed to update import report'
        }, { status: 500 });
      }
      
      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'import',
        entity_id: reportId,
        details: {
          before: {
            filename: existingReport.filename,
            status: existingReport.status
          },
          after: updateData
        }
      }, req);
      
      return NextResponse.json({
        success: true,
        report: updatedReport
      });
    } catch (error) {
      console.error('Error in PATCH /api/admin/import/reports/:reportId:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { reportId } = await context.params;
      const { searchParams } = new URL(req.url);
      
      // Check if user wants to delete questions too
      const deleteQuestions = searchParams.get('delete_questions') === 'true';
      
      console.log(`[DELETE] Starting batch delete for reportId: ${reportId}, deleteQuestions: ${deleteQuestions}`);
      
      // Validate report exists
      const { data: existingReport, error: fetchError } = await supabase
        .from('import_reports')
        .select('id, filename, successful_rows')
        .eq('id', reportId)
        .single();
      
      if (fetchError || !existingReport) {
        console.error('[DELETE] Report not found:', fetchError);
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      console.log(`[DELETE] Found report: ${existingReport.filename}`);
      
      // First check if import_report_id column exists by trying to count linked questions
      let linkedQuestionsCount = 0;
      let columnExists = true;
      
      try {
        const { count, error: countError } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('import_report_id', reportId);
        
        if (countError) {
          // Column might not exist
          if (countError.message?.includes('column') || countError.code === '42703') {
            console.warn('[DELETE] import_report_id column does not exist');
            columnExists = false;
          } else {
            throw countError;
          }
        } else {
          linkedQuestionsCount = count || 0;
          console.log(`[DELETE] Found ${linkedQuestionsCount} linked questions`);
        }
      } catch (err) {
        console.warn('[DELETE] Could not check linked questions:', err);
        columnExists = false;
      }
      
      let questionsDeleted = 0;
      let questionsUnlinked = 0;
      
      // If column exists and there are linked questions, handle them
      if (columnExists && linkedQuestionsCount > 0) {
        if (deleteQuestions) {
          // Delete questions linked to this batch
          const { error: deleteQuestionsError } = await supabase
            .from('questions')
            .delete()
            .eq('import_report_id', reportId);
          
          if (deleteQuestionsError) {
            console.error('[DELETE] Error deleting questions:', deleteQuestionsError);
            return NextResponse.json({
              error: 'Failed to delete questions',
              details: deleteQuestionsError.message
            }, { status: 500 });
          }
          
          questionsDeleted = linkedQuestionsCount;
          console.log(`[DELETE] Deleted ${questionsDeleted} questions`);
        } else {
          // Unlink questions from batch (set import_report_id to NULL)
          const { error: unlinkError } = await supabase
            .from('questions')
            .update({ import_report_id: null })
            .eq('import_report_id', reportId);
          
          if (unlinkError) {
            console.error('[DELETE] Error unlinking questions:', unlinkError);
            return NextResponse.json({
              error: 'Failed to unlink questions',
              details: unlinkError.message
            }, { status: 500 });
          }
          
          questionsUnlinked = linkedQuestionsCount;
          console.log(`[DELETE] Unlinked ${questionsUnlinked} questions`);
        }
      }
      
      // Delete the import report
      const { error: deleteError } = await supabase
        .from('import_reports')
        .delete()
        .eq('id', reportId);
      
      if (deleteError) {
        console.error('[DELETE] Error deleting import report:', deleteError);
        return NextResponse.json({
          error: 'Failed to delete import report',
          details: deleteError.message
        }, { status: 500 });
      }
      
      console.log(`[DELETE] Successfully deleted report: ${reportId}`);
      
      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'import',
        entity_id: reportId,
        details: {
          filename: existingReport.filename,
          successful_rows: existingReport.successful_rows,
          delete_questions: deleteQuestions,
          questions_deleted: questionsDeleted,
          questions_unlinked: questionsUnlinked,
          column_exists: columnExists
        }
      }, req);
      
      let message = 'Import batch deleted successfully.';
      if (questionsDeleted > 0) {
        message = `Import batch and ${questionsDeleted} questions deleted successfully.`;
      } else if (questionsUnlinked > 0) {
        message = `Import batch deleted. ${questionsUnlinked} questions have been unlinked.`;
      } else if (!columnExists) {
        message = 'Import batch deleted. Note: Question linking not available (migration required).';
      }
      
      return NextResponse.json({
        success: true,
        message,
        details: {
          questionsDeleted,
          questionsUnlinked,
          columnExists
        }
      });
    } catch (error) {
      console.error('[DELETE] Error in DELETE /api/admin/import/reports/:reportId:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
