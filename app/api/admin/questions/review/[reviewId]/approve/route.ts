import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

interface RouteParams {
  params: Promise<{ reviewId: string }>;
}

/**
 * POST /api/admin/questions/review/[reviewId]/approve
 * Approve or reject a review
 */
export async function POST(request: NextRequest, context: RouteParams) {
  const { reviewId } = await context.params;
  
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const body = await request.json();
      const { approved, rejectionReason } = body;

      if (typeof approved !== 'boolean') {
        return createErrorResponse(400, 'approved (boolean) is required');
      }

      const supabase = await createServerClient();

      // Fetch review
      const { data: review, error: reviewError } = await supabase
        .from('question_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (reviewError || !review) {
        return createErrorResponse(404, 'Review not found');
      }

      if (review.status !== 'pending') {
        return createErrorResponse(400, `Review is already ${review.status}`);
      }

      if (approved) {
        // Update question with proposed content
        const { error: updateError } = await supabase
          .from('questions')
          .update({
            hint1: review.proposed_hint1 || undefined,
            hint2: review.proposed_hint2 || undefined,
            hint3: review.proposed_hint3 || undefined,
            solution: review.proposed_solution || undefined,
            explanation: review.proposed_explanation || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', review.question_id);

        if (updateError) {
          return createErrorResponse(500, `Failed to update question: ${updateError.message}`);
        }

        // Update review status
        const { error: statusError } = await supabase
          .from('question_reviews')
          .update({
            status: 'approved',
            approved_by: adminUser.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', reviewId);

        if (statusError) {
          return createErrorResponse(500, `Failed to update review status: ${statusError.message}`);
        }

        // Log approval
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'question_review_approved',
          entity_type: 'question',
          entity_id: review.question_id,
          details: {
            reviewId: review.id,
          },
        });

        return createSuccessResponse({
          message: 'Review approved and question updated',
          reviewId: review.id,
          questionId: review.question_id,
        });
      } else {
        // Reject review
        const { error: rejectError } = await supabase
          .from('question_reviews')
          .update({
            status: 'rejected',
            approved_by: adminUser.id,
            approved_at: new Date().toISOString(),
            rejection_reason: rejectionReason || 'Rejected by admin',
          })
          .eq('id', reviewId);

        if (rejectError) {
          return createErrorResponse(500, `Failed to reject review: ${rejectError.message}`);
        }

        // Log rejection
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'question_review_rejected',
          entity_type: 'question',
          entity_id: review.question_id,
          details: {
            reviewId: review.id,
            rejectionReason: rejectionReason || 'Rejected by admin',
          },
        });

        return createSuccessResponse({
          message: 'Review rejected',
          reviewId: review.id,
        });
      }
    } catch (error: any) {
      return createErrorResponse(500, error.message || 'Internal server error');
    }
  });
}
