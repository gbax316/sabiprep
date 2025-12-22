import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

/**
 * GET /api/admin/questions/review/history
 * Get review history with filtering and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const questionId = searchParams.get('questionId');
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
      const offset = (page - 1) * limit;

      const supabase = await createServerClient();

      // Build query
      let query = supabase
        .from('question_reviews')
        .select(`
          *,
          question:question_id (
            id,
            question_text,
            subject_id,
            topic_id
          ),
          reviewer:reviewed_by (
            id,
            full_name,
            email
          ),
          approver:approved_by (
            id,
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (questionId) {
        query = query.eq('question_id', questionId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: reviews, error: reviewsError, count } = await query;

      if (reviewsError) {
        return createErrorResponse(500, `Failed to fetch reviews: ${reviewsError.message}`);
      }

      return createSuccessResponse({
        reviews: reviews || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error: any) {
      return createErrorResponse(500, error.message || 'Internal server error');
    }
  });
}

