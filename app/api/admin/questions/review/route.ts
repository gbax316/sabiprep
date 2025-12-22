import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';
import { reviewQuestion } from '@/lib/ai/anthropic-client';
import { validateReviewResult } from '@/lib/ai/validation';
import type { Question } from '@/types/database';

/**
 * POST /api/admin/questions/review
 * Review a single question using AI
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const body = await request.json();
      const { questionId } = body;

      if (!questionId) {
        return createErrorResponse(400, 'questionId is required');
      }

      const supabase = await createServerClient();

      // Fetch question with subject information
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id (
            name
          )
        `)
        .eq('id', questionId)
        .single();

      if (questionError || !question) {
        return createErrorResponse(404, 'Question not found');
      }

      // Get subject name for prompt customization
      const subjectName = (question.subjects as any)?.name;

      // Check if there's already a pending review for this question
      const { data: existingReview } = await supabase
        .from('question_reviews')
        .select('id, status')
        .eq('question_id', questionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingReview) {
        return createErrorResponse(409, 'A pending review already exists for this question');
      }

      const startTime = Date.now();

      try {
        // Generate review content using AI
        const reviewResult = await reviewQuestion(question as Question, subjectName);

        const durationMs = Date.now() - startTime;

        // Validate the generated content
        const validation = validateReviewResult(reviewResult);

        // Create review record
        const { data: review, error: reviewError } = await supabase
          .from('question_reviews')
          .insert({
            question_id: questionId,
            reviewed_by: adminUser.id,
            review_type: 'single',
            status: validation.isValid ? 'pending' : 'failed',
            proposed_hint1: reviewResult.hint1,
            proposed_hint2: reviewResult.hint2,
            proposed_hint3: reviewResult.hint3,
            proposed_solution: reviewResult.solution,
            proposed_explanation: reviewResult.explanation,
            model_used: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
            tokens_used: reviewResult.tokensUsed,
            review_duration_ms: durationMs,
            error_message: validation.isValid 
              ? undefined 
              : `Validation failed: ${validation.issues.join(', ')}`,
          })
          .select()
          .single();

        if (reviewError) {
          return createErrorResponse(500, `Failed to create review record: ${reviewError.message}`);
        }

        // Log admin action
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'question_review_created',
          entity_type: 'question',
          entity_id: questionId,
          details: {
            reviewId: review.id,
            validationIssues: validation.issues,
            validationWarnings: validation.warnings,
          },
        });

        return createSuccessResponse({
          review: {
            ...review,
            validation,
          },
        });
      } catch (error: any) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error during review';

        // Create failed review record
        await supabase
          .from('question_reviews')
          .insert({
            question_id: questionId,
            reviewed_by: adminUser.id,
            review_type: 'single',
            status: 'failed',
            model_used: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
            review_duration_ms: durationMs,
            error_message: errorMessage,
          });

        // Log error
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'question_review_failed',
          entity_type: 'question',
          entity_id: questionId,
          details: {
            error: errorMessage,
          },
        });

        return createErrorResponse(500, `Review failed: ${errorMessage}`);
      }
    } catch (error: any) {
      return createErrorResponse(500, error.message || 'Internal server error');
    }
  });
}

