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
      
      // Validate report exists
      const { data: existingReport, error: fetchError } = await supabase
        .from('import_reports')
        .select('id, filename, successful_rows')
        .eq('id', reportId)
        .single();
      
      if (fetchError || !existingReport) {
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      // If deleting questions, delete them first
      if (deleteQuestions) {
        const { error: deleteQuestionsError } = await supabase
          .from('questions')
          .delete()
          .eq('import_report_id', reportId);
        
        if (deleteQuestionsError) {
          console.error('Error deleting questions:', deleteQuestionsError);
          return NextResponse.json({
            error: 'Failed to delete questions'
          }, { status: 500 });
        }
      } else {
        // Unlink questions from batch (set import_report_id to NULL)
        const { error: unlinkError } = await supabase
          .from('questions')
          .update({ import_report_id: null })
          .eq('import_report_id', reportId);
        
        if (unlinkError) {
          console.error('Error unlinking questions:', unlinkError);
          return NextResponse.json({
            error: 'Failed to unlink questions'
          }, { status: 500 });
        }
      }
      
      // Delete the import report
      const { error: deleteError } = await supabase
        .from('import_reports')
        .delete()
        .eq('id', reportId);
      
      if (deleteError) {
        console.error('Error deleting import report:', deleteError);
        return NextResponse.json({
          error: 'Failed to delete import report'
        }, { status: 500 });
      }
      
      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'import',
        entity_id: reportId,
        details: {
          filename: existingReport.filename,
          successful_rows: existingReport.successful_rows,
          delete_questions: deleteQuestions
        }
      }, req);
      
      return NextResponse.json({
        success: true,
        message: deleteQuestions 
          ? 'Import batch and all questions deleted successfully'
          : 'Import batch deleted. Questions have been unlinked.'
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/import/reports/:reportId:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
