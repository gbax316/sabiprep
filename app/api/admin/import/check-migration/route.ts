// Check if import_report_id migration has been applied
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const supabase = await createServerClient();
      
      // Check if import_report_id column exists
      const { data, error } = await supabase
        .from('questions')
        .select('id, import_report_id')
        .limit(1);
      
      if (error) {
        // If error contains "column" it likely means the column doesn't exist
        if (error.message?.includes('column') || error.message?.includes('import_report_id')) {
          return NextResponse.json({
            success: false,
            migrationApplied: false,
            message: 'import_report_id column does not exist. Please run the migration.',
            error: error.message
          });
        }
        throw error;
      }
      
      // Count questions with import_report_id set
      const { count: linkedCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .not('import_report_id', 'is', null);
      
      const { count: totalCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true });
      
      return NextResponse.json({
        success: true,
        migrationApplied: true,
        message: 'Migration is applied. import_report_id column exists.',
        stats: {
          totalQuestions: totalCount || 0,
          linkedQuestions: linkedCount || 0,
          unlinkedQuestions: (totalCount || 0) - (linkedCount || 0)
        }
      });
    } catch (error) {
      console.error('Error checking migration:', error);
      return NextResponse.json({
        success: false,
        migrationApplied: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
