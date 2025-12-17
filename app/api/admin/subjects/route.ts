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
 * GET /api/admin/subjects
 * List all subjects with question counts and topic counts
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const status = searchParams.get('status');
      const sortBy = searchParams.get('sortBy') || 'display_order';
      const sortOrder = searchParams.get('sortOrder') || 'asc';
      
      // Build query
      let query = supabase
        .from('subjects')
        .select(`
          id,
          name,
          slug,
          description,
          icon,
          color,
          exam_types,
          status,
          display_order,
          total_questions,
          created_at,
          updated_at
        `);
      
      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }
      
      // Apply sorting
      const validSortColumns = ['name', 'display_order', 'created_at', 'total_questions'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'display_order';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      
      // Execute query
      const { data: subjects, error: subjectsError } = await query;
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch subjects');
      }
      
      // Get topic counts for each subject
      const { data: topicCounts, error: topicCountsError } = await supabase
        .from('topics')
        .select('subject_id');
      
      if (topicCountsError) {
        console.error('Error fetching topic counts:', topicCountsError);
      }
      
      // Calculate topic counts per subject
      const topicCountMap: Record<string, number> = {};
      if (topicCounts) {
        topicCounts.forEach(topic => {
          const subjectId = topic.subject_id;
          topicCountMap[subjectId] = (topicCountMap[subjectId] || 0) + 1;
        });
      }
      
      // Get question counts for each subject
      const { data: questionCounts, error: questionCountsError } = await supabase
        .from('questions')
        .select('subject_id');
      
      if (questionCountsError) {
        console.error('Error fetching question counts:', questionCountsError);
      }
      
      // Calculate question counts per subject
      const questionCountMap: Record<string, number> = {};
      if (questionCounts) {
        questionCounts.forEach(question => {
          const subjectId = question.subject_id;
          questionCountMap[subjectId] = (questionCountMap[subjectId] || 0) + 1;
        });
      }
      
      // Combine data
      const subjectsWithCounts = (subjects || []).map(subject => ({
        ...subject,
        topic_count: topicCountMap[subject.id] || 0,
        question_count: questionCountMap[subject.id] || subject.total_questions || 0,
      }));
      
      return NextResponse.json({
        success: true,
        subjects: subjectsWithCounts,
      });
    } catch (error) {
      console.error('Error in GET /api/admin/subjects:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * POST /api/admin/subjects
 * Create a new subject
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const body = await req.json();
      const { name, icon, color, description, exam_types } = body;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Subject name is required');
      }
      
      // Generate slug from name
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      // Check if subject with same name or slug exists
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .or(`name.ilike.${name},slug.eq.${slug}`)
        .single();
      
      if (existing) {
        return createErrorResponse(409, 'Conflict', 'A subject with this name already exists');
      }
      
      // Get the next display order
      const { data: maxOrderResult } = await supabase
        .from('subjects')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      
      const nextDisplayOrder = (maxOrderResult?.display_order || 0) + 1;
      
      // Create subject
      const { data: newSubject, error: createError } = await supabase
        .from('subjects')
        .insert({
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          icon: icon || null,
          color: color || null,
          exam_types: exam_types || [],
          status: 'active',
          display_order: nextDisplayOrder,
          total_questions: 0,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating subject:', createError);
        return createErrorResponse(500, 'Database Error', 'Failed to create subject');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'CREATE',
        entity_type: 'subject',
        entity_id: newSubject.id,
        details: {
          name: newSubject.name,
          slug: newSubject.slug,
        },
      }, req);
      
      return createSuccessResponse({
        subject: {
          ...newSubject,
          topic_count: 0,
          question_count: 0,
        },
        message: 'Subject created successfully',
      }, 201);
    } catch (error) {
      console.error('Error in POST /api/admin/subjects:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
