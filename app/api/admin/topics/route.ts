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
 * GET /api/admin/topics
 * List topics with optional subject filter
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const subjectId = searchParams.get('subjectId');
      const status = searchParams.get('status');
      const sortBy = searchParams.get('sortBy') || 'display_order';
      const sortOrder = searchParams.get('sortOrder') || 'asc';
      
      // Build query
      let query = supabase
        .from('topics')
        .select(`
          id,
          name,
          slug,
          description,
          difficulty,
          status,
          display_order,
          total_questions,
          subject_id,
          created_at,
          updated_at,
          subjects!inner(name, slug, color, icon)
        `);
      
      // Apply subject filter
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }
      
      // Apply sorting
      const validSortColumns = ['name', 'display_order', 'created_at', 'total_questions'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'display_order';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      
      // Execute query
      const { data: topics, error: topicsError } = await query;
      
      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch topics');
      }
      
      // Get question counts for each topic
      const { data: questionCounts, error: questionCountsError } = await supabase
        .from('questions')
        .select('topic_id');
      
      if (questionCountsError) {
        console.error('Error fetching question counts:', questionCountsError);
      }
      
      // Calculate question counts per topic
      const questionCountMap: Record<string, number> = {};
      if (questionCounts) {
        questionCounts.forEach(question => {
          const topicId = question.topic_id;
          questionCountMap[topicId] = (questionCountMap[topicId] || 0) + 1;
        });
      }
      
      // Format topics with subject info and question count
      // Define subject type
      type SubjectInfo = { name: string; slug: string; color: string; icon: string };
      
      const formattedTopics = (topics || []).map(topic => {
        // Handle the joined subjects data - Supabase may return object or array depending on relationship
        const rawSubjects = topic.subjects;
        let subjectData: SubjectInfo | null = null;
        
        if (rawSubjects) {
          if (Array.isArray(rawSubjects) && rawSubjects.length > 0) {
            subjectData = rawSubjects[0] as SubjectInfo;
          } else if (!Array.isArray(rawSubjects)) {
            subjectData = rawSubjects as SubjectInfo;
          }
        }
        
        return {
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
          description: topic.description,
          difficulty: topic.difficulty,
          status: topic.status,
          display_order: topic.display_order,
          subject_id: topic.subject_id,
          subject_name: subjectData?.name || '',
          subject_slug: subjectData?.slug || '',
          subject_color: subjectData?.color || '',
          subject_icon: subjectData?.icon || '',
          question_count: questionCountMap[topic.id] || topic.total_questions || 0,
          created_at: topic.created_at,
          updated_at: topic.updated_at,
        };
      });
      
      return NextResponse.json({
        success: true,
        topics: formattedTopics,
      });
    } catch (error) {
      console.error('Error in GET /api/admin/topics:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * POST /api/admin/topics
 * Create a new topic
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const body = await req.json();
      const { name, subject_id, description, difficulty } = body;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Topic name is required');
      }
      
      if (!subject_id) {
        return createErrorResponse(400, 'Bad Request', 'Subject ID is required');
      }
      
      // Check if subject exists
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subject_id)
        .single();
      
      if (subjectError || !subject) {
        return createErrorResponse(404, 'Not Found', 'Subject not found');
      }
      
      // Generate slug from name
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      // Check if topic with same slug exists in the same subject
      const { data: existing } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subject_id)
        .eq('slug', slug)
        .single();
      
      if (existing) {
        return createErrorResponse(409, 'Conflict', 'A topic with this name already exists in this subject');
      }
      
      // Get the next display order for this subject
      const { data: maxOrderResult } = await supabase
        .from('topics')
        .select('display_order')
        .eq('subject_id', subject_id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      
      const nextDisplayOrder = (maxOrderResult?.display_order || 0) + 1;
      
      // Validate difficulty if provided
      const validDifficulties = ['Easy', 'Medium', 'Hard'];
      const topicDifficulty = difficulty && validDifficulties.includes(difficulty) 
        ? difficulty 
        : null;
      
      // Create topic
      const { data: newTopic, error: createError } = await supabase
        .from('topics')
        .insert({
          name: name.trim(),
          slug,
          subject_id,
          description: description?.trim() || null,
          difficulty: topicDifficulty,
          status: 'active',
          display_order: nextDisplayOrder,
          total_questions: 0,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating topic:', createError);
        return createErrorResponse(500, 'Database Error', 'Failed to create topic');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'CREATE',
        entity_type: 'topic',
        entity_id: newTopic.id,
        details: {
          name: newTopic.name,
          slug: newTopic.slug,
          subject_id: subject_id,
          subject_name: subject.name,
        },
      }, req);
      
      return createSuccessResponse({
        topic: {
          ...newTopic,
          subject_name: subject.name,
          question_count: 0,
        },
        message: 'Topic created successfully',
      }, 201);
    } catch (error) {
      console.error('Error in POST /api/admin/topics:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
