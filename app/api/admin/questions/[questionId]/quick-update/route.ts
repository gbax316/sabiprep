// Quick Update Question Route - for inline editing
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser, logAdminAction } from '@/lib/api/admin-auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ questionId: string }> }
) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { questionId } = await context.params;
      const body = await req.json();
      
      // Validate question exists
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('id, correct_answer, hint, hint1, hint2, hint3, solution, explanation, status')
        .eq('id', questionId)
        .single();
      
      if (fetchError || !existingQuestion) {
        return NextResponse.json({
          error: 'Question not found'
        }, { status: 404 });
      }
      
      // Prepare update data - only allow quick-editable fields
      const allowedFields = [
        'correct_answer',
        'hint',
        'hint1',
        'hint2',
        'hint3',
        'solution',
        'explanation',
        'status',
        'difficulty'
      ];
      
      const updateData: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({
          error: 'No valid fields to update'
        }, { status: 400 });
      }
      
      // Validate correct_answer if provided
      if (updateData.correct_answer) {
        const validAnswers = ['A', 'B', 'C', 'D', 'E'];
        updateData.correct_answer = updateData.correct_answer.toUpperCase();
        if (!validAnswers.includes(updateData.correct_answer)) {
          return NextResponse.json({
            error: 'Invalid correct answer. Must be A, B, C, D, or E'
          }, { status: 400 });
        }
      }
      
      // Validate status if provided
      if (updateData.status) {
        const validStatuses = ['draft', 'published', 'archived'];
        if (!validStatuses.includes(updateData.status)) {
          return NextResponse.json({
            error: 'Invalid status. Must be draft, published, or archived'
          }, { status: 400 });
        }
      }
      
      // Validate difficulty if provided
      if (updateData.difficulty) {
        const validDifficulties = ['Easy', 'Medium', 'Hard'];
        updateData.difficulty = updateData.difficulty.charAt(0).toUpperCase() + updateData.difficulty.slice(1).toLowerCase();
        if (!validDifficulties.includes(updateData.difficulty)) {
          return NextResponse.json({
            error: 'Invalid difficulty. Must be Easy, Medium, or Hard'
          }, { status: 400 });
        }
      }
      
      // Add updated_at
      updateData.updated_at = new Date().toISOString();
      
      // Update question
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', questionId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating question:', updateError);
        return NextResponse.json({
          error: 'Failed to update question'
        }, { status: 500 });
      }
      
      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'UPDATE',
        entity_type: 'question',
        entity_id: questionId,
        details: {
          quick_update: true,
          fields_updated: Object.keys(updateData),
          before: existingQuestion,
          after: updateData
        }
      }, req);
      
      return NextResponse.json({
        success: true,
        question: updatedQuestion
      });
    } catch (error) {
      console.error('Error in PATCH /api/admin/questions/[questionId]/quick-update:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
