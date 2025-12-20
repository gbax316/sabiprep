// Get Questions for Import Batch Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { reportId } = await context.params;
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const status = searchParams.get('status');
      const subjectId = searchParams.get('subject_id');
      const topicId = searchParams.get('topic_id');
      const search = searchParams.get('search');
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // First verify the import report exists
      const { data: report, error: reportError } = await supabase
        .from('import_reports')
        .select('id')
        .eq('id', reportId)
        .single();
      
      if (reportError || !report) {
        return NextResponse.json({
          error: 'Import report not found'
        }, { status: 404 });
      }
      
      // Build query for questions
      let query = supabase
        .from('questions')
        .select(`
          id,
          subject_id,
          topic_id,
          question_text,
          passage,
          passage_id,
          question_image_url,
          option_a,
          option_b,
          option_c,
          option_d,
          option_e,
          correct_answer,
          difficulty,
          exam_type,
          exam_year,
          status,
          created_at,
          subjects(name),
          topics(name)
        `, { count: 'exact' })
        .eq('import_report_id', reportId);
      
      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      if (search) {
        query = query.ilike('question_text', `%${search}%`);
      }
      
      // Apply sorting (newest first)
      query = query.order('created_at', { ascending: false });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data: questions, error: questionsError, count } = await query;
      
      if (questionsError) {
        console.error('Error fetching batch questions:', questionsError);
        return NextResponse.json({
          error: 'Failed to fetch questions'
        }, { status: 500 });
      }
      
      // Transform data
      const transformedQuestions = (questions || []).map((q: any) => ({
        id: q.id,
        subject_id: q.subject_id,
        topic_id: q.topic_id,
        question_text: q.question_text,
        passage: q.passage,
        passage_id: q.passage_id,
        question_image_url: q.question_image_url,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        exam_type: q.exam_type,
        exam_year: q.exam_year,
        status: q.status,
        created_at: q.created_at,
        subject: q.subjects?.name || null,
        topic: q.topics?.name || null,
      }));
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return NextResponse.json({
        success: true,
        questions: transformedQuestions,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error in GET /api/admin/import/reports/:reportId/questions:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
