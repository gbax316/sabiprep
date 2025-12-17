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
  params: Promise<{
    topicId: string;
  }>;
}

/**
 * GET /api/admin/topics/[topicId]
 * Get topic details with question count by difficulty/year
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { topicId } = await params;
      const supabase = await createServerClient();
      
      // Get topic details with subject info
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select(`
          *,
          subjects!inner(id, name, slug, color, icon)
        `)
        .eq('id', topicId)
        .single();
      
      if (topicError) {
        if (topicError.code === 'PGRST116') {
          return createErrorResponse(404, 'Not Found', 'Topic not found');
        }
        console.error('Error fetching topic:', topicError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch topic');
      }
      
      // Get questions for this topic
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, difficulty, exam_year, status')
        .eq('topic_id', topicId);
      
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }
      
      // Calculate question statistics
      const totalQuestions = questions?.length || 0;
      
      // By difficulty
      const questionsByDifficulty: Record<string, number> = {
        Easy: 0,
        Medium: 0,
        Hard: 0,
      };
      
      // By year
      const questionsByYear: Record<number, number> = {};
      
      // By status
      const questionsByStatus: Record<string, number> = {
        draft: 0,
        published: 0,
        archived: 0,
      };
      
      if (questions) {
        questions.forEach(q => {
          // Count by difficulty
          if (q.difficulty && questionsByDifficulty[q.difficulty] !== undefined) {
            questionsByDifficulty[q.difficulty]++;
          }
          
          // Count by year
          if (q.exam_year) {
            questionsByYear[q.exam_year] = (questionsByYear[q.exam_year] || 0) + 1;
          }
          
          // Count by status
          if (q.status && questionsByStatus[q.status] !== undefined) {
            questionsByStatus[q.status]++;
          }
        });
      }
      
      // Format subject info - handle both array and object return types
      type SubjectInfo = { id: string; name: string; slug: string; color: string; icon: string };
      const rawSubjects = topic.subjects;
      let subjectData: SubjectInfo | null = null;
      
      if (rawSubjects) {
        if (Array.isArray(rawSubjects) && rawSubjects.length > 0) {
          subjectData = rawSubjects[0] as SubjectInfo;
        } else if (!Array.isArray(rawSubjects)) {
          subjectData = rawSubjects as SubjectInfo;
        }
      }
      
      return NextResponse.json({
        success: true,
        topic: {
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
          created_at: topic.created_at,
          updated_at: topic.updated_at,
        },
        statistics: {
          totalQuestions,
          byDifficulty: questionsByDifficulty,
          byYear: questionsByYear,
          byStatus: questionsByStatus,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/admin/topics/[topicId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * PUT /api/admin/topics/[topicId]
 * Update a topic (name, status, display_order, description)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { topicId } = await params;
      const supabase = await createServerClient();
      const body = await req.json();
      
      // Validate topicId
      if (!topicId) {
        return createErrorResponse(400, 'Bad Request', 'Topic ID is required');
      }
      
      // Check if topic exists
      const { data: existingTopic, error: fetchError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();
      
      if (fetchError || !existingTopic) {
        return createErrorResponse(404, 'Not Found', 'Topic not found');
      }
      
      // Build update object - only include provided fields
      const updateData: Record<string, unknown> = {};
      
      if (body.name !== undefined) {
        const name = body.name?.trim();
        if (!name || name.length === 0) {
          return createErrorResponse(400, 'Bad Request', 'Topic name cannot be empty');
        }
        
        // Check if another topic in the same subject has the same name
        const newSlug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        const { data: duplicateName } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', existingTopic.subject_id)
          .eq('slug', newSlug)
          .neq('id', topicId)
          .single();
        
        if (duplicateName) {
          return createErrorResponse(409, 'Conflict', 'A topic with this name already exists in this subject');
        }
        
        updateData.name = name;
        updateData.slug = newSlug;
      }
      
      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }
      
      if (body.difficulty !== undefined) {
        const validDifficulties = ['Easy', 'Medium', 'Hard', null];
        if (body.difficulty !== null && !validDifficulties.includes(body.difficulty)) {
          return createErrorResponse(400, 'Bad Request', 'Invalid difficulty. Must be "Easy", "Medium", "Hard", or null');
        }
        updateData.difficulty = body.difficulty;
      }
      
      if (body.status !== undefined) {
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(body.status)) {
          return createErrorResponse(400, 'Bad Request', 'Invalid status. Must be "active" or "inactive"');
        }
        updateData.status = body.status;
      }
      
      if (body.display_order !== undefined) {
        const displayOrder = parseInt(body.display_order, 10);
        if (isNaN(displayOrder) || displayOrder < 0) {
          return createErrorResponse(400, 'Bad Request', 'Invalid display_order');
        }
        updateData.display_order = displayOrder;
      }
      
      // If no updates provided
      if (Object.keys(updateData).length === 0) {
        return createErrorResponse(400, 'Bad Request', 'No valid update fields provided');
      }
      
      // Update the topic
      const { data: updatedTopic, error: updateError } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating topic:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to update topic');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'topic',
        entity_id: topicId,
        details: {
          before: existingTopic,
          after: updatedTopic,
          changes: updateData,
        },
      }, req);
      
      return createSuccessResponse({
        topic: updatedTopic,
        message: 'Topic updated successfully',
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/topics/[topicId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * DELETE /api/admin/topics/[topicId]
 * Soft delete (archive) or hard delete a topic
 * Only allows deletion if no questions reference it, otherwise archives
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can delete
      if (!canPerformDestructiveAction(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can delete topics');
      }
      
      const { topicId } = await params;
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Check for force archive parameter
      const forceArchive = searchParams.get('archive') === 'true';
      
      // Check if topic exists
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();
      
      if (fetchError || !topic) {
        return createErrorResponse(404, 'Not Found', 'Topic not found');
      }
      
      // Check for questions
      const { count: questionCount, error: questionCountError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);
      
      if (questionCountError) {
        console.error('Error counting questions:', questionCountError);
      }
      
      // If topic has questions, can only archive
      const hasQuestions = (questionCount || 0) > 0;
      
      if (hasQuestions) {
        if (!forceArchive) {
          return NextResponse.json({
            success: false,
            canDelete: false,
            canArchive: true,
            message: 'Cannot delete topic with associated questions',
            details: {
              questionCount: questionCount || 0,
            },
          }, { status: 409 });
        }
        
        // Archive instead of delete
        const { data: archivedTopic, error: archiveError } = await supabase
          .from('topics')
          .update({ status: 'inactive' })
          .eq('id', topicId)
          .select()
          .single();
        
        if (archiveError) {
          console.error('Error archiving topic:', archiveError);
          return createErrorResponse(500, 'Database Error', 'Failed to archive topic');
        }
        
        // Log the action
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'STATUS_CHANGE',
          entity_type: 'topic',
          entity_id: topicId,
          details: {
            action: 'archived',
            reason: 'Topic has associated questions',
            questionCount: questionCount || 0,
          },
        }, req);
        
        return NextResponse.json({
          success: true,
          archived: true,
          deleted: false,
          topic: archivedTopic,
          message: 'Topic archived successfully (has associated questions)',
        });
      }
      
      // No questions - safe to delete
      const { error: deleteError } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
      
      if (deleteError) {
        console.error('Error deleting topic:', deleteError);
        return createErrorResponse(500, 'Database Error', 'Failed to delete topic');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'topic',
        entity_id: topicId,
        details: {
          deletedTopic: topic,
        },
      }, req);
      
      return NextResponse.json({
        success: true,
        archived: false,
        deleted: true,
        message: 'Topic deleted successfully',
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/topics/[topicId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  }, ['admin']); // Only admins can delete
}
