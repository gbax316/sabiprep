// Import Reports List Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const status = searchParams.get('status');
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Build query
      let query = supabase
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
          import_type,
          started_at,
          completed_at,
          created_at,
          users!admin_id(full_name, email)
        `, { count: 'exact' });
      
      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      // Apply sorting (newest first)
      query = query.order('created_at', { ascending: false });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data: reports, error: reportsError, count } = await query;
      
      if (reportsError) {
        console.error('Error fetching import reports:', reportsError);
        return NextResponse.json({
          error: 'Failed to fetch import reports'
        }, { status: 500 });
      }
      
      // Transform data
      const transformedReports = (reports || []).map((report: Record<string, unknown>) => ({
        id: report.id,
        admin_id: report.admin_id,
        filename: report.filename,
        file_size_bytes: report.file_size_bytes,
        total_rows: report.total_rows,
        successful_rows: report.successful_rows,
        failed_rows: report.failed_rows,
        status: report.status,
        import_type: report.import_type,
        started_at: report.started_at,
        completed_at: report.completed_at,
        created_at: report.created_at,
        admin: report.users
      }));
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return NextResponse.json({
        success: true,
        reports: transformedReports,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error in GET /api/admin/import/reports:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
