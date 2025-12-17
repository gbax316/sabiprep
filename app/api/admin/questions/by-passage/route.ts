import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

/**
 * GET /api/admin/questions/by-passage
 * Get all questions grouped by passage_id
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      const passageId = searchParams.get('passage_id');
      
      // Validate required parameter
      if (!passageId || typeof passageId !== 'string' || passageId.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'passage_id query parameter is required');
      }
      
      // Fetch questions with the specified passage_id
      const { data: questions, error: questionsError } = await supabase
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
          users:created_by(id, full_name)
        `)
        .eq('passage_id', passageId.trim())
        .order('created_at', { ascending: true });
      
      if (questionsError) {
        console.error('Error fetching questions by passage:', questionsError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch questions');
      }
      
      // Transform data to match expected format
      const transformedQuestions = (questions || []).map((q: Record<string, unknown>) => ({
        id: q.id,
        subject_id: q.subject_id,
        topic_id: q.topic_id,
        question_text: q.question_text,
        passage: q.passage,
        passage_id: q.passage_id,
        question_image_url: q.question_image_url,
        image_alt_text: q.image_alt_text,
        image_width: q.image_width,
        image_height: q.image_height,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        hint: q.hint,
        solution: q.solution,
        further_study_links: q.further_study_links,
        difficulty: q.difficulty,
        exam_type: q.exam_type,
        exam_year: q.exam_year,
        status: q.status,
        created_by: q.created_by,
        created_at: q.created_at,
        updated_at: q.updated_at,
        subject: q.subjects,
        topic: q.topics,
        creator: q.users,
      }));
      
      return createSuccessResponse({
        passage_id: passageId.trim(),
        total: transformedQuestions.length,
        questions: transformedQuestions,
      });
    } catch (error) {
      console.error('Error in GET /api/admin/questions/by-passage:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
