import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

interface ReorderItem {
  id: string;
  display_order: number;
}

/**
 * PUT /api/admin/topics/reorder
 * Batch update display_order for drag-and-drop reordering
 */
export async function PUT(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();
      const body = await req.json();
      const { items, subject_id } = body;
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Items array is required');
      }
      
      // Validate each item
      const validItems: ReorderItem[] = [];
      for (const item of items) {
        if (!item.id || typeof item.display_order !== 'number') {
          return createErrorResponse(400, 'Bad Request', 'Each item must have id and display_order');
        }
        if (item.display_order < 0) {
          return createErrorResponse(400, 'Bad Request', 'display_order must be non-negative');
        }
        validItems.push({
          id: item.id,
          display_order: item.display_order,
        });
      }
      
      // Verify all topics exist and belong to the specified subject (if provided)
      const topicIds = validItems.map(item => item.id);
      let verifyQuery = supabase
        .from('topics')
        .select('id, subject_id')
        .in('id', topicIds);
      
      if (subject_id) {
        verifyQuery = verifyQuery.eq('subject_id', subject_id);
      }
      
      const { data: existingTopics, error: verifyError } = await verifyQuery;
      
      if (verifyError) {
        console.error('Error verifying topics:', verifyError);
        return createErrorResponse(500, 'Database Error', 'Failed to verify topics');
      }
      
      // Check if all topics were found
      const existingIds = new Set(existingTopics?.map(t => t.id) || []);
      const missingIds = topicIds.filter(id => !existingIds.has(id));
      
      if (missingIds.length > 0) {
        return createErrorResponse(404, 'Not Found', `Topics not found: ${missingIds.join(', ')}`);
      }
      
      // If subject_id provided, verify all topics belong to the same subject
      if (subject_id && existingTopics) {
        const wrongSubjectTopics = existingTopics.filter(t => t.subject_id !== subject_id);
        if (wrongSubjectTopics.length > 0) {
          return createErrorResponse(400, 'Bad Request', 'All topics must belong to the specified subject');
        }
      }
      
      // Update display_order for each topic
      const updatePromises = validItems.map(item => 
        supabase
          .from('topics')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );
      
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Errors updating topics:', errors);
        return createErrorResponse(500, 'Database Error', 'Failed to update some topics');
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'topic',
        details: {
          action: 'reorder',
          subject_id: subject_id || null,
          items: validItems,
          topicCount: validItems.length,
        },
      }, req);
      
      return NextResponse.json({
        success: true,
        message: `Successfully reordered ${validItems.length} topics`,
        updatedCount: validItems.length,
      });
    } catch (error) {
      console.error('Error in PUT /api/admin/topics/reorder:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
