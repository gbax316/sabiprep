import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

/**
 * GET /api/admin/questions
 * List questions with pagination and comprehensive filtering
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const search = searchParams.get('search') || '';
      const subjectId = searchParams.get('subjectId');
      const topicId = searchParams.get('topicId');
      const examType = searchParams.get('examType');
      const year = searchParams.get('year');
      const difficulty = searchParams.get('difficulty');
      const status = searchParams.get('status');
      const sortBy = searchParams.get('sortBy') || 'created_at';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Build query for questions with subject and topic names
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
          hint1,
          hint2,
          hint3,
          solution,
          further_study_links,
          difficulty,
          exam_type,
          exam_year,
          status,
          created_by,
          created_at,
          updated_at,
          subjects!inner(name, slug),
          topics!inner(name, slug),
          users:created_by(full_name)
        `, { count: 'exact' });
      
      // Apply filters
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      if (examType) {
        query = query.eq('exam_type', examType);
      }
      
      if (year) {
        query = query.eq('exam_year', parseInt(year, 10));
      }
      
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // Apply search filter on question text
      if (search.trim()) {
        query = query.ilike('question_text', `%${search}%`);
      }
      
      // Apply sorting
      const validSortColumns = ['created_at', 'exam_year', 'difficulty', 'updated_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data: questions, error: questionsError, count } = await query;
      
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
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
        hint1: q.hint1,
        hint2: q.hint2,
        hint3: q.hint3,
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
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return NextResponse.json({
        success: true,
        questions: transformedQuestions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/admin/questions:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * POST /api/admin/questions
 * Create a new question
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const body = await req.json();
      
      const {
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
        hint1,
        hint2,
        hint3,
        solution,
        further_study_links,
        difficulty,
        exam_type,
        exam_year,
        status = 'draft',
      } = body;
      
      // Validate required fields
      if (!subject_id) {
        return createErrorResponse(400, 'Bad Request', 'Subject is required');
      }
      
      if (!topic_id) {
        return createErrorResponse(400, 'Bad Request', 'Topic is required');
      }
      
      if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Question text is required');
      }
      
      if (!option_a || typeof option_a !== 'string' || option_a.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Option A is required');
      }
      
      if (!option_b || typeof option_b !== 'string' || option_b.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Option B is required');
      }
      
      if (!correct_answer || !['A', 'B', 'C', 'D', 'E'].includes(correct_answer)) {
        return createErrorResponse(400, 'Bad Request', 'Valid correct answer (A-E) is required');
      }
      
      // Verify that correct answer has corresponding option
      const optionMap: Record<string, string | undefined> = {
        A: option_a,
        B: option_b,
        C: option_c,
        D: option_d,
        E: option_e,
      };
      
      if (!optionMap[correct_answer]) {
        return createErrorResponse(400, 'Bad Request', `Option ${correct_answer} must be provided when it's the correct answer`);
      }
      
      if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        return createErrorResponse(400, 'Bad Request', 'Valid difficulty (Easy, Medium, Hard) is required');
      }
      
      if (!exam_type || typeof exam_type !== 'string' || exam_type.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Exam type is required');
      }
      
      // Validate image alt text if image URL is provided
      if (question_image_url && (!image_alt_text || typeof image_alt_text !== 'string' || image_alt_text.trim().length === 0)) {
        return createErrorResponse(400, 'Bad Request', 'Image alt text is required when question image is provided');
      }
      
      // Validate image dimensions if provided
      if (image_width !== undefined && image_width !== null) {
        const width = typeof image_width === 'string' ? parseInt(image_width, 10) : image_width;
        if (isNaN(width) || width <= 0) {
          return createErrorResponse(400, 'Bad Request', 'Image width must be a positive integer');
        }
      }
      
      if (image_height !== undefined && image_height !== null) {
        const height = typeof image_height === 'string' ? parseInt(image_height, 10) : image_height;
        if (isNaN(height) || height <= 0) {
          return createErrorResponse(400, 'Bad Request', 'Image height must be a positive integer');
        }
      }
      
      // Verify subject exists
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subject_id)
        .single();
      
      if (subjectError || !subject) {
        return createErrorResponse(400, 'Bad Request', 'Invalid subject');
      }
      
      // Verify topic exists and belongs to subject
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('id, name')
        .eq('id', topic_id)
        .eq('subject_id', subject_id)
        .single();
      
      if (topicError || !topic) {
        return createErrorResponse(400, 'Bad Request', 'Invalid topic or topic does not belong to the selected subject');
      }
      
      // Validate status
      if (!['draft', 'published'].includes(status)) {
        return createErrorResponse(400, 'Bad Request', 'Invalid status');
      }
      
      // Process further_study_links
      let processedLinks: string[] | null = null;
      if (further_study_links) {
        if (Array.isArray(further_study_links)) {
          processedLinks = further_study_links.filter((link: unknown) => typeof link === 'string' && link.trim().length > 0);
        } else if (typeof further_study_links === 'string') {
          processedLinks = further_study_links.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        }
      }
      
      // Create question
      const { data: newQuestion, error: createError } = await supabase
        .from('questions')
        .insert({
          subject_id,
          topic_id,
          question_text: question_text.trim(),
          passage: passage?.trim() || null,
          passage_id: passage_id?.trim() || null,
          question_image_url: question_image_url?.trim() || null,
          image_alt_text: image_alt_text?.trim() || null,
          image_width: image_width ? (typeof image_width === 'string' ? parseInt(image_width, 10) : image_width) : null,
          image_height: image_height ? (typeof image_height === 'string' ? parseInt(image_height, 10) : image_height) : null,
          option_a: option_a.trim(),
          option_b: option_b.trim(),
          option_c: option_c?.trim() || null,
          option_d: option_d?.trim() || null,
          option_e: option_e?.trim() || null,
          correct_answer,
          explanation: explanation?.trim() || null,
          hint: hint?.trim() || null,
          hint1: hint1?.trim() || null,
          hint2: hint2?.trim() || null,
          hint3: hint3?.trim() || null,
          solution: solution?.trim() || null,
          further_study_links: processedLinks,
          difficulty,
          exam_type,
          exam_year: exam_year ? parseInt(exam_year, 10) : null,
          status,
          created_by: adminUser.id,
        })
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
          hint1,
          hint2,
          hint3,
          solution,
          further_study_links,
          difficulty,
          exam_type,
          exam_year,
          status,
          created_by,
          created_at,
          updated_at
        `)
        .single();
      
      if (createError) {
        console.error('Error creating question:', createError);
        return createErrorResponse(500, 'Database Error', 'Failed to create question');
      }
      
      // Update question counts - wait for result and handle errors
      try {
        await supabase.rpc('increment_question_count', {
          target_subject_id: subject_id,
          target_topic_id: topic_id
        });
      } catch {
        // RPC function may not exist - silently continue
        // Question counts can be recalculated later if needed
        console.log('increment_question_count RPC not available');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'CREATE',
        entity_type: 'question',
        entity_id: newQuestion.id,
        details: {
          subject: subject.name,
          topic: topic.name,
          difficulty,
          exam_type,
          status,
        },
      }, req);
      
      return createSuccessResponse({
        question: {
          ...newQuestion,
          subject: { name: subject.name },
          topic: { name: topic.name },
          creator: { full_name: adminUser.full_name },
        },
        message: 'Question created successfully',
      }, 201);
    } catch (error) {
      console.error('Error in POST /api/admin/questions:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
