import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  canPerformDestructiveAction,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

interface RouteParams {
  params: Promise<{ questionId: string }>;
}

/**
 * GET /api/admin/questions/[questionId]
 * Get full question details including usage statistics
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const { questionId } = await context.params;
  
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const supabase = createServerClient();
      
      // Fetch question with relations
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select(`
          id,
          subject_id,
          topic_id,
          question_text,
          passage,
          passage_id,
          question_image_url,
          image_alt_text,
          image_width,
          image_height,
          option_a,
          option_b,
          option_c,
          option_d,
          option_e,
          correct_answer,
          explanation,
          hint,
          solution,
          further_study_links,
          difficulty,
          exam_type,
          exam_year,
          status,
          created_by,
          created_at,
          updated_at,
          subjects(id, name, slug),
          topics(id, name, slug),
          users:created_by(id, full_name, email)
        `)
        .eq('id', questionId)
        .single();
      
      if (questionError) {
        if (questionError.code === 'PGRST116') {
          return createErrorResponse(404, 'Not Found', 'Question not found');
        }
        console.error('Error fetching question:', questionError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch question');
      }
      
      // Get usage statistics
      const { data: usageStats } = await supabase
        .from('session_answers')
        .select('is_correct')
        .eq('question_id', questionId);
      
      const timesAnswered = usageStats?.length || 0;
      const timesCorrect = usageStats?.filter(a => a.is_correct).length || 0;
      const accuracy = timesAnswered > 0 ? Math.round((timesCorrect / timesAnswered) * 100) : 0;
      
      // Transform the response
      const transformedQuestion = {
        id: question.id,
        subject_id: question.subject_id,
        topic_id: question.topic_id,
        question_text: question.question_text,
        passage: question.passage,
        passage_id: question.passage_id,
        question_image_url: question.question_image_url,
        image_alt_text: question.image_alt_text,
        image_width: question.image_width,
        image_height: question.image_height,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        option_e: question.option_e,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        hint: question.hint,
        solution: question.solution,
        further_study_links: question.further_study_links,
        difficulty: question.difficulty,
        exam_type: question.exam_type,
        exam_year: question.exam_year,
        status: question.status,
        created_by: question.created_by,
        created_at: question.created_at,
        updated_at: question.updated_at,
        subject: question.subjects,
        topic: question.topics,
        creator: question.users,
        usage_stats: {
          times_answered: timesAnswered,
          times_correct: timesCorrect,
          accuracy,
        },
      };
      
      return createSuccessResponse({ question: transformedQuestion });
    } catch (error) {
      console.error('Error in GET /api/admin/questions/[questionId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * PUT /api/admin/questions/[questionId]
 * Update any question field
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const { questionId } = await context.params;
  
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();
      const body = await req.json();
      
      // First, verify the question exists
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();
      
      if (fetchError || !existingQuestion) {
        return createErrorResponse(404, 'Not Found', 'Question not found');
      }
      
      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};
      const allowedFields = [
        'subject_id',
        'topic_id',
        'question_text',
        'passage',
        'passage_id',
        'question_image_url',
        'image_alt_text',
        'image_width',
        'image_height',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'option_e',
        'correct_answer',
        'explanation',
        'hint',
        'solution',
        'further_study_links',
        'difficulty',
        'exam_type',
        'exam_year',
        'status',
      ];
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if (field === 'further_study_links' && body[field]) {
            // Process further_study_links
            if (Array.isArray(body[field])) {
              updateData[field] = body[field].filter((link: unknown) => typeof link === 'string' && link.trim().length > 0);
            } else if (typeof body[field] === 'string') {
              updateData[field] = body[field].split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            }
          } else if (field === 'exam_year' && body[field]) {
            updateData[field] = parseInt(body[field], 10);
          } else if (field === 'image_width' || field === 'image_height') {
            // Handle image dimensions
            const value = typeof body[field] === 'string' ? parseInt(body[field], 10) : body[field];
            updateData[field] = value || null;
          } else if (typeof body[field] === 'string') {
            updateData[field] = body[field].trim() || null;
          } else {
            updateData[field] = body[field];
          }
        }
      }
      
      // Validate required fields if they're being updated
      if (updateData.question_text !== undefined && (!updateData.question_text || (updateData.question_text as string).length === 0)) {
        return createErrorResponse(400, 'Bad Request', 'Question text cannot be empty');
      }
      
      if (updateData.option_a !== undefined && (!updateData.option_a || (updateData.option_a as string).length === 0)) {
        return createErrorResponse(400, 'Bad Request', 'Option A cannot be empty');
      }
      
      if (updateData.option_b !== undefined && (!updateData.option_b || (updateData.option_b as string).length === 0)) {
        return createErrorResponse(400, 'Bad Request', 'Option B cannot be empty');
      }
      
      if (updateData.correct_answer !== undefined && !['A', 'B', 'C', 'D', 'E'].includes(updateData.correct_answer as string)) {
        return createErrorResponse(400, 'Bad Request', 'Invalid correct answer');
      }
      
      if (updateData.difficulty !== undefined && !['Easy', 'Medium', 'Hard'].includes(updateData.difficulty as string)) {
        return createErrorResponse(400, 'Bad Request', 'Invalid difficulty');
      }
      
      if (updateData.status !== undefined && !['draft', 'published', 'archived'].includes(updateData.status as string)) {
        return createErrorResponse(400, 'Bad Request', 'Invalid status');
      }
      
      // Validate image alt text if image URL is being updated
      if (updateData.question_image_url !== undefined) {
        const imageUrl = updateData.question_image_url as string | null;
        const altText = (updateData.image_alt_text !== undefined ? updateData.image_alt_text : existingQuestion.image_alt_text) as string | null;
        
        if (imageUrl && (!altText || altText.trim().length === 0)) {
          return createErrorResponse(400, 'Bad Request', 'Image alt text is required when question image is provided');
        }
      }
      
      // Validate image dimensions if being updated
      if (updateData.image_width !== undefined && updateData.image_width !== null) {
        const width = typeof updateData.image_width === 'string' ? parseInt(updateData.image_width, 10) : updateData.image_width as number;
        if (isNaN(width) || width <= 0) {
          return createErrorResponse(400, 'Bad Request', 'Image width must be a positive integer');
        }
      }
      
      if (updateData.image_height !== undefined && updateData.image_height !== null) {
        const height = typeof updateData.image_height === 'string' ? parseInt(updateData.image_height, 10) : updateData.image_height as number;
        if (isNaN(height) || height <= 0) {
          return createErrorResponse(400, 'Bad Request', 'Image height must be a positive integer');
        }
      }
      
      // Verify subject if being updated
      if (updateData.subject_id) {
        const { data: subject, error: subjectError } = await supabase
          .from('subjects')
          .select('id')
          .eq('id', updateData.subject_id)
          .single();
        
        if (subjectError || !subject) {
          return createErrorResponse(400, 'Bad Request', 'Invalid subject');
        }
      }
      
      // Verify topic if being updated
      if (updateData.topic_id) {
        const subjectIdToCheck = (updateData.subject_id || existingQuestion.subject_id) as string;
        const { data: topic, error: topicError } = await supabase
          .from('topics')
          .select('id')
          .eq('id', updateData.topic_id)
          .eq('subject_id', subjectIdToCheck)
          .single();
        
        if (topicError || !topic) {
          return createErrorResponse(400, 'Bad Request', 'Invalid topic or topic does not belong to the selected subject');
        }
      }
      
      // Set updated_at
      updateData.updated_at = new Date().toISOString();
      
      // Update the question
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', questionId)
        .select(`
          id,
          subject_id,
          topic_id,
          question_text,
          passage,
          passage_id,
          question_image_url,
          image_alt_text,
          image_width,
          image_height,
          option_a,
          option_b,
          option_c,
          option_d,
          option_e,
          correct_answer,
          explanation,
          hint,
          solution,
          further_study_links,
          difficulty,
          exam_type,
          exam_year,
          status,
          created_by,
          created_at,
          updated_at,
          subjects(name, slug),
          topics(name, slug),
          users:created_by(full_name)
        `)
        .single();
      
      if (updateError) {
        console.error('Error updating question:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to update question');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'question',
        entity_id: questionId,
        details: {
          updated_fields: Object.keys(updateData),
          before: existingQuestion,
          after: updatedQuestion,
        },
      }, req);
      
      // Transform the response
      const transformedQuestion = {
        ...updatedQuestion,
        subject: updatedQuestion.subjects,
        topic: updatedQuestion.topics,
        creator: updatedQuestion.users,
      };
      
      return createSuccessResponse({
        question: transformedQuestion,
        message: 'Question updated successfully',
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/questions/[questionId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * DELETE /api/admin/questions/[questionId]
 * Soft delete (set status to archived)
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const { questionId } = await context.params;
  
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can delete
      if (!canPerformDestructiveAction(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can delete questions');
      }
      
      const supabase = createServerClient();
      
      // Verify question exists and get image URL for cleanup
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('id, subject_id, topic_id, status, question_image_url')
        .eq('id', questionId)
        .single();
      
      if (fetchError || !existingQuestion) {
        return createErrorResponse(404, 'Not Found', 'Question not found');
      }
      
      // Soft delete by setting status to archived
      const { error: updateError } = await supabase
        .from('questions')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', questionId);
      
      if (updateError) {
        console.error('Error archiving question:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to archive question');
      }
      
      // Delete associated image from storage if exists
      if (existingQuestion.question_image_url) {
        try {
          // Extract file path from URL
          const url = new URL(existingQuestion.question_image_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(pathParts.indexOf('questions')).join('/');
          
          if (filePath) {
            await supabase.storage
              .from('question-images')
              .remove([filePath]);
          }
        } catch (error) {
          // Log but don't fail the deletion if image cleanup fails
          console.error('Error deleting question image:', error);
        }
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'question',
        entity_id: questionId,
        details: {
          previous_status: existingQuestion.status,
          soft_deleted: true,
        },
      }, req);
      
      return createSuccessResponse({
        message: 'Question archived successfully',
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/questions/[questionId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
