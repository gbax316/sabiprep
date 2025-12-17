import { NextRequest } from 'next/server';
import { 
  withAdminAuth, 
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser 
} from '@/lib/api/admin-auth';

/**
 * POST /api/admin/questions/preview
 * Accept question data and return formatted preview as student would see
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const body = await req.json();
      
      const {
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
        difficulty,
        exam_type,
        exam_year,
      } = body;
      
      // Validate minimum required fields
      if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
        return createErrorResponse(400, 'Bad Request', 'Question text is required for preview');
      }
      
      // Build options array
      const options: Array<{ label: string; text: string; isCorrect: boolean }> = [];
      
      if (option_a) {
        options.push({ label: 'A', text: option_a, isCorrect: correct_answer === 'A' });
      }
      if (option_b) {
        options.push({ label: 'B', text: option_b, isCorrect: correct_answer === 'B' });
      }
      if (option_c) {
        options.push({ label: 'C', text: option_c, isCorrect: correct_answer === 'C' });
      }
      if (option_d) {
        options.push({ label: 'D', text: option_d, isCorrect: correct_answer === 'D' });
      }
      if (option_e) {
        options.push({ label: 'E', text: option_e, isCorrect: correct_answer === 'E' });
      }
      
      // Build the preview object
      const preview = {
        // Question view (what student sees initially)
        question_view: {
          passage: passage?.trim() || null,
          passage_id: passage_id?.trim() || null,
          question_text: question_text.trim(),
          question_image: question_image_url ? {
            url: question_image_url,
            alt_text: image_alt_text?.trim() || '',
            width: image_width || null,
            height: image_height || null,
          } : null,
          options,
          metadata: {
            difficulty: difficulty || null,
            exam_type: exam_type || null,
            exam_year: exam_year || null,
          },
        },
        // Solution view (what student sees after answering)
        solution_view: {
          correct_answer,
          correct_option_text: options.find(o => o.isCorrect)?.text || null,
          explanation: explanation?.trim() || null,
          hint: hint?.trim() || null,
          solution: solution?.trim() || null,
        },
        // Validation info
        validation: {
          has_passage: !!passage?.trim(),
          has_passage_id: !!passage_id?.trim(),
          has_image: !!question_image_url,
          has_image_alt_text: !!image_alt_text?.trim(),
          image_validation: question_image_url ? {
            has_alt_text: !!image_alt_text?.trim(),
            has_dimensions: !!(image_width && image_height),
            is_valid: !!image_alt_text?.trim(), // Alt text is required when image exists
          } : null,
          options_count: options.length,
          has_explanation: !!explanation?.trim(),
          has_hint: !!hint?.trim(),
          has_solution: !!solution?.trim(),
          is_complete: (
            question_text?.trim() &&
            options.length >= 2 &&
            correct_answer &&
            options.some(o => o.isCorrect) &&
            (!question_image_url || !!image_alt_text?.trim()) // If image exists, alt text must exist
          ),
        },
      };
      
      return createSuccessResponse({ preview });
    } catch (error) {
      console.error('Error in POST /api/admin/questions/preview:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
