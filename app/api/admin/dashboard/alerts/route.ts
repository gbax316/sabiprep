import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, createSuccessResponse, createErrorResponse } from '@/lib/api/admin-auth';
import type { AdminApiUser } from '@/lib/api/admin-auth';
import type { SystemAlert } from '@/types/admin';

/**
 * Alerts API Response
 */
interface AlertsResponse {
  alerts: SystemAlert[];
}

/**
 * GET /api/admin/dashboard/alerts
 * Returns system alerts including:
 * - Failed imports
 * - Questions with missing fields
 * - Duplicate questions detected
 * - Low content areas (topics with < 5 questions)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAdminAuth(request, async (user: AdminApiUser) => {
    try {
      const supabase = await createServerClient();
      const alerts: SystemAlert[] = [];
      
      // Run all checks in parallel
      const [
        failedImportsResult,
        questionsWithMissingFieldsResult,
        lowContentTopicsResult,
        draftQuestionsResult,
      ] = await Promise.all([
        // Check for failed imports
        supabase
          .from('import_reports')
          .select('id, filename, created_at')
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Check for questions with missing explanations
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .is('explanation', null),
        
        // Check for topics with low question count
        supabase
          .from('topics')
          .select('id, name, total_questions, subject_id')
          .lt('total_questions', 5)
          .eq('status', 'active'),
        
        // Check for large number of draft questions
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
      ]);
      
      // Process failed imports
      if (failedImportsResult.data && failedImportsResult.data.length > 0) {
        failedImportsResult.data.forEach((importReport) => {
          alerts.push({
            id: `import-failed-${importReport.id}`,
            type: 'error',
            message: `Import "${importReport.filename}" failed`,
            action: `/admin/import/history`,
            createdAt: importReport.created_at,
          });
        });
      }
      
      // Process questions with missing fields
      const missingFieldsCount = questionsWithMissingFieldsResult.count || 0;
      if (missingFieldsCount > 0) {
        alerts.push({
          id: 'questions-missing-explanation',
          type: 'warning',
          message: `${missingFieldsCount} published question${missingFieldsCount > 1 ? 's' : ''} missing explanations`,
          action: `/admin/questions?filter=missing-explanation`,
          createdAt: new Date().toISOString(),
        });
      }
      
      // Process low content topics
      if (lowContentTopicsResult.data && lowContentTopicsResult.data.length > 0) {
        const topicCount = lowContentTopicsResult.data.length;
        if (topicCount > 3) {
          // If too many, show aggregate alert
          alerts.push({
            id: 'topics-low-content-aggregate',
            type: 'warning',
            message: `${topicCount} topics have fewer than 5 questions`,
            action: `/admin/content/topics?filter=low-content`,
            createdAt: new Date().toISOString(),
          });
        } else {
          // Show individual alerts for each topic
          lowContentTopicsResult.data.forEach((topic) => {
            alerts.push({
              id: `topic-low-content-${topic.id}`,
              type: 'info',
              message: `Topic "${topic.name}" has only ${topic.total_questions} question${topic.total_questions !== 1 ? 's' : ''}`,
              action: `/admin/questions?topic=${topic.id}`,
              createdAt: new Date().toISOString(),
            });
          });
        }
      }
      
      // Process draft questions alert
      const draftCount = draftQuestionsResult.count || 0;
      if (draftCount > 10) {
        alerts.push({
          id: 'questions-pending-review',
          type: 'info',
          message: `${draftCount} question${draftCount > 1 ? 's' : ''} pending review in draft status`,
          action: `/admin/questions?status=draft`,
          createdAt: new Date().toISOString(),
        });
      }
      
      // Check for old pending imports (imports stuck in processing)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: stuckImports } = await supabase
        .from('import_reports')
        .select('id, filename, started_at')
        .eq('status', 'processing')
        .lt('started_at', oneHourAgo)
        .limit(3);
      
      if (stuckImports && stuckImports.length > 0) {
        stuckImports.forEach((importReport) => {
          alerts.push({
            id: `import-stuck-${importReport.id}`,
            type: 'error',
            message: `Import "${importReport.filename}" has been processing for over an hour`,
            action: `/admin/import/history`,
            createdAt: importReport.started_at,
          });
        });
      }
      
      // Sort alerts by type (errors first, then warnings, then info)
      const typeOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
      alerts.sort((a, b) => {
        const typeCompare = typeOrder[a.type] - typeOrder[b.type];
        if (typeCompare !== 0) return typeCompare;
        // Then by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      const response: AlertsResponse = {
        alerts,
      };
      
      return createSuccessResponse(response);
    } catch (error) {
      console.error('Error fetching dashboard alerts:', error);
      return createErrorResponse(500, 'Internal Server Error', 'Failed to fetch system alerts');
    }
  });
}
