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
 * POST /api/admin/questions/review/batch
 * Review multiple questions using AI (processed sequentially)
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const body = await request.json();
      const { questionIds, batchSize } = body;

      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return createErrorResponse(400, 'questionIds array is required');
      }

      const maxBatchSize = batchSize || 10;
      const limitedQuestionIds = questionIds.slice(0, maxBatchSize);

      const supabase = await createServerClient();

      // Fetch all questions with subject information
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id (
            name
          )
        `)
        .in('id', limitedQuestionIds);

      if (questionsError || !questions || questions.length === 0) {
        return createErrorResponse(404, 'No questions found');
      }

      const results: Array<{
        questionId: string;
        success: boolean;
        reviewId?: string;
        error?: string;
        validation?: any;
      }> = [];

      // Process questions sequentially to respect rate limits
      for (const question of questions) {
        const subjectName = (question.subjects as any)?.name;
        const startTime = Date.now();

        try {
          // Check for existing pending review
          const { data: existingReview } = await supabase
            .from('question_reviews')
            .select('id')
            .eq('question_id', question.id)
            .eq('status', 'pending')
            .limit(1)
            .single();

          if (existingReview) {
            results.push({
              questionId: question.id,
              success: false,
              error: 'Pending review already exists',
            });
            continue;
          }

          // Generate review content
          const reviewResult = await reviewQuestion(question as Question, subjectName);
          const durationMs = Date.now() - startTime;

          // Validate content
          const validation = validateReviewResult(reviewResult);

          // Create review record
          const { data: review, error: reviewError } = await supabase
            .from('question_reviews')
            .insert({
              question_id: question.id,
              reviewed_by: adminUser.id,
              review_type: 'batch',
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
            results.push({
              questionId: question.id,
              success: false,
              error: `Failed to create review: ${reviewError.message}`,
            });
            continue;
          }

          results.push({
            questionId: question.id,
            success: true,
            reviewId: review.id,
            validation,
          });

          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          const durationMs = Date.now() - startTime;
          const errorMessage = error.message || 'Unknown error';

          // Create failed review record
          await supabase
            .from('question_reviews')
            .insert({
              question_id: question.id,
              reviewed_by: adminUser.id,
              review_type: 'batch',
              status: 'failed',
              model_used: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
              review_duration_ms: durationMs,
              error_message: errorMessage,
            });

          results.push({
            questionId: question.id,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Log batch action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'question_review_batch_created',
        entity_type: 'question',
        details: {
          totalQuestions: limitedQuestionIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });

      return createSuccessResponse({
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
    } catch (error: any) {
      return createErrorResponse(500, error.message || 'Internal server error');
    }
  });
}

