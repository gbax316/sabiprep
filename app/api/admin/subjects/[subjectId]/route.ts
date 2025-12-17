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
    subjectId: string;
  }>;
}

/**
 * GET /api/admin/subjects/[subjectId]
 * Get subject details with topics list
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { subjectId } = await params;
      const supabase = await createServerClient();
      
      // Get subject details
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (subjectError) {
        if (subjectError.code === 'PGRST116') {
          return createErrorResponse(404, 'Not Found', 'Subject not found');
        }
        console.error('Error fetching subject:', subjectError);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch subject');
      }
      
      // Get topics for this subject
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });
      
      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
      }
      
      // Get question count for this subject
      const { count: questionCount, error: questionCountError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);
      
      if (questionCountError) {
        console.error('Error fetching question count:', questionCountError);
      }
      
      // Get question counts per topic
      const topicQuestionCounts: Record<string, number> = {};
      if (topics && topics.length > 0) {
        const { data: topicQuestions } = await supabase
          .from('questions')
          .select('topic_id')
          .eq('subject_id', subjectId);
        
        if (topicQuestions) {
          topicQuestions.forEach(q => {
            topicQuestionCounts[q.topic_id] = (topicQuestionCounts[q.topic_id] || 0) + 1;
          });
        }
      }
      
      // Attach question counts to topics
      const topicsWithCounts = (topics || []).map(topic => ({
        ...topic,
        question_count: topicQuestionCounts[topic.id] || topic.total_questions || 0,
      }));
      
      return NextResponse.json({
        success: true,
        subject: {
          ...subject,
          topic_count: topics?.length || 0,
          question_count: questionCount || subject.total_questions || 0,
        },
        topics: topicsWithCounts,
      });
    } catch (error) {
      console.error('Error in GET /api/admin/subjects/[subjectId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * PUT /api/admin/subjects/[subjectId]
 * Update a subject (name, icon, color, status, display_order)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const { subjectId } = await params;
      const supabase = await createServerClient();
      const body = await req.json();
      
      // Validate subjectId
      if (!subjectId) {
        return createErrorResponse(400, 'Bad Request', 'Subject ID is required');
      }
      
      // Check if subject exists
      const { data: existingSubject, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (fetchError || !existingSubject) {
        return createErrorResponse(404, 'Not Found', 'Subject not found');
      }
      
      // Build update object - only include provided fields
      const updateData: Record<string, unknown> = {};
      
      if (body.name !== undefined) {
        const name = body.name?.trim();
        if (!name || name.length === 0) {
          return createErrorResponse(400, 'Bad Request', 'Subject name cannot be empty');
        }
        
        // Check if another subject has the same name
        const { data: duplicateName } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', name)
          .neq('id', subjectId)
          .single();
        
        if (duplicateName) {
          return createErrorResponse(409, 'Conflict', 'A subject with this name already exists');
        }
        
        updateData.name = name;
        // Update slug if name changes
        updateData.slug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }
      
      if (body.icon !== undefined) {
        updateData.icon = body.icon || null;
      }
      
      if (body.color !== undefined) {
        updateData.color = body.color || null;
      }
      
      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }
      
      if (body.exam_types !== undefined) {
        updateData.exam_types = body.exam_types || [];
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
      
      // Update the subject
      const { data: updatedSubject, error: updateError } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', subjectId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating subject:', updateError);
        return createErrorResponse(500, 'Database Error', 'Failed to update subject');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'subject',
        entity_id: subjectId,
        details: {
          before: existingSubject,
          after: updatedSubject,
          changes: updateData,
        },
      }, req);
      
      return createSuccessResponse({
        subject: updatedSubject,
        message: 'Subject updated successfully',
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/subjects/[subjectId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * DELETE /api/admin/subjects/[subjectId]
 * Soft delete (archive) or hard delete a subject
 * Only allows deletion if no questions reference it, otherwise archives
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can delete
      if (!canPerformDestructiveAction(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can delete subjects');
      }
      
      const { subjectId } = await params;
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Check for force delete parameter
      const forceArchive = searchParams.get('archive') === 'true';
      
      // Check if subject exists
      const { data: subject, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (fetchError || !subject) {
        return createErrorResponse(404, 'Not Found', 'Subject not found');
      }
      
      // Check for topics
      const { count: topicCount, error: topicCountError } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);
      
      if (topicCountError) {
        console.error('Error counting topics:', topicCountError);
      }
      
      // Check for questions
      const { count: questionCount, error: questionCountError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);
      
      if (questionCountError) {
        console.error('Error counting questions:', questionCountError);
      }
      
      // If subject has topics or questions, can only archive
      const hasTopics = (topicCount || 0) > 0;
      const hasQuestions = (questionCount || 0) > 0;
      
      if (hasTopics || hasQuestions) {
        if (!forceArchive) {
          return NextResponse.json({
            success: false,
            canDelete: false,
            canArchive: true,
            message: 'Cannot delete subject with associated topics or questions',
            details: {
              topicCount: topicCount || 0,
              questionCount: questionCount || 0,
            },
          }, { status: 409 });
        }
        
        // Archive instead of delete
        const { data: archivedSubject, error: archiveError } = await supabase
          .from('subjects')
          .update({ status: 'inactive' })
          .eq('id', subjectId)
          .select()
          .single();
        
        if (archiveError) {
          console.error('Error archiving subject:', archiveError);
          return createErrorResponse(500, 'Database Error', 'Failed to archive subject');
        }
        
        // Log the action
        await logAdminAction({
          admin_id: adminUser.id,
          action: 'STATUS_CHANGE',
          entity_type: 'subject',
          entity_id: subjectId,
          details: {
            action: 'archived',
            reason: 'Subject has associated topics or questions',
            topicCount: topicCount || 0,
            questionCount: questionCount || 0,
          },
        }, req);
        
        return NextResponse.json({
          success: true,
          archived: true,
          deleted: false,
          subject: archivedSubject,
          message: 'Subject archived successfully (has associated content)',
        });
      }
      
      // No topics or questions - safe to delete
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (deleteError) {
        console.error('Error deleting subject:', deleteError);
        return createErrorResponse(500, 'Database Error', 'Failed to delete subject');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'DELETE',
        entity_type: 'subject',
        entity_id: subjectId,
        details: {
          deletedSubject: subject,
        },
      }, req);
      
      return NextResponse.json({
        success: true,
        archived: false,
        deleted: true,
        message: 'Subject deleted successfully',
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/subjects/[subjectId]:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  }, ['admin']); // Only admins can delete
}
