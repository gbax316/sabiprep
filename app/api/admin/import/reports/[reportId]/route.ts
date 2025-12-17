// Import Report Detail Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';

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
