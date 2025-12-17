// CSV Validation Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, type AdminApiUser } from '@/lib/api/admin-auth';
import Papa from 'papaparse';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  duplicates: number[];
}

const REQUIRED_FIELDS = ['subject_id', 'topic_id', 'exam_type', 'year', 'question_text', 'option_a', 'option_b', 'correct_answer'];
const VALID_EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'GCE'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_ANSWERS = ['A', 'B', 'C', 'D', 'E'];

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();

      // Get CSV content from request
      const body = await req.json();
    const { csvContent } = body;

    if (!csvContent) {
      return NextResponse.json({ error: 'CSV content is required' }, { status: 400 });
    }

      // Parse CSV
      const parseResult = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        comments: '#' // Skip comment lines
      });

      if (parseResult.errors.length > 0) {
        return NextResponse.json({
          error: 'CSV parsing error',
          details: parseResult.errors
        }, { status: 400 });
      }

      const rows = parseResult.data;
      const errors: ValidationError[] = [];
      const validRowIndices: number[] = [];
      const duplicates: number[] = [];
      const questionTexts = new Set<string>();

      // Fetch valid subject and topic IDs for validation
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id');
      
      const { data: topics } = await supabase
        .from('topics')
        .select('id');

      const validSubjectIds = new Set(subjects?.map((s: { id: string }) => s.id) || []);
      const validTopicIds = new Set(topics?.map((t: { id: string }) => t.id) || []);

      // Validate each row
      rows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because of header row and 0-index
        let rowIsValid = true;

        // Check required fields
        REQUIRED_FIELDS.forEach(field => {
          if (!row[field] || row[field].trim() === '') {
            errors.push({
              row: rowNumber,
              field,
              message: `Required field is missing or empty`,
              value: row[field]
            });
            rowIsValid = false;
          }
        });

        // Validate subject_id exists
        if (row.subject_id && !validSubjectIds.has(row.subject_id.trim())) {
          errors.push({
            row: rowNumber,
            field: 'subject_id',
            message: 'Subject ID does not exist in database',
            value: row.subject_id
          });
          rowIsValid = false;
        }

        // Validate topic_id exists
        if (row.topic_id && !validTopicIds.has(row.topic_id.trim())) {
          errors.push({
            row: rowNumber,
            field: 'topic_id',
            message: 'Topic ID does not exist in database',
            value: row.topic_id
          });
          rowIsValid = false;
        }

        // Validate exam_type
        if (row.exam_type && !VALID_EXAM_TYPES.includes(row.exam_type.trim().toUpperCase())) {
          errors.push({
            row: rowNumber,
            field: 'exam_type',
            message: `Exam type must be one of: ${VALID_EXAM_TYPES.join(', ')}`,
            value: row.exam_type
          });
          rowIsValid = false;
        }

        // Validate year (4-digit number)
        if (row.year) {
          const year = parseInt(row.year);
          if (isNaN(year) || row.year.length !== 4 || year < 1900 || year > 2100) {
            errors.push({
              row: rowNumber,
              field: 'year',
              message: 'Year must be a valid 4-digit year',
              value: row.year
            });
            rowIsValid = false;
          }
        }

        // Validate difficulty (optional)
        if (row.difficulty && row.difficulty.trim() !== '') {
          if (!VALID_DIFFICULTIES.includes(row.difficulty.trim().toLowerCase())) {
            errors.push({
              row: rowNumber,
              field: 'difficulty',
              message: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
              value: row.difficulty
            });
            rowIsValid = false;
          }
        }

        // Validate correct_answer
        if (row.correct_answer && !VALID_ANSWERS.includes(row.correct_answer.trim().toUpperCase())) {
          errors.push({
            row: rowNumber,
            field: 'correct_answer',
            message: `Correct answer must be one of: ${VALID_ANSWERS.join(', ')}`,
            value: row.correct_answer
          });
          rowIsValid = false;
        }

        // Validate that correct_answer matches an existing option
        if (row.correct_answer) {
          const answerKey = row.correct_answer.trim().toUpperCase();
          const optionField = `option_${answerKey.toLowerCase()}`;
          if (!row[optionField] || row[optionField].trim() === '') {
            errors.push({
              row: rowNumber,
              field: 'correct_answer',
              message: `Correct answer "${answerKey}" has no corresponding option`,
              value: row.correct_answer
            });
            rowIsValid = false;
          }
        }

        // Validate image fields
        if (row.question_image_url && row.question_image_url.trim() !== '') {
          // Validate URL format
          try {
            new URL(row.question_image_url.trim());
          } catch (e) {
            errors.push({
              row: rowNumber,
              field: 'question_image_url',
              message: 'Invalid URL format for question image',
              value: row.question_image_url
            });
            rowIsValid = false;
          }

          // Require alt text when image is provided
          if (!row.image_alt_text || row.image_alt_text.trim() === '') {
            errors.push({
              row: rowNumber,
              field: 'image_alt_text',
              message: 'Alt text is required when question_image_url is provided (for accessibility)',
              value: row.image_alt_text
            });
            rowIsValid = false;
          }
        }

        // Validate image dimensions if provided
        if (row.image_width && row.image_width.trim() !== '') {
          const width = parseInt(row.image_width);
          if (isNaN(width) || width <= 0) {
            errors.push({
              row: rowNumber,
              field: 'image_width',
              message: 'Image width must be a positive integer',
              value: row.image_width
            });
            rowIsValid = false;
          }
        }

        if (row.image_height && row.image_height.trim() !== '') {
          const height = parseInt(row.image_height);
          if (isNaN(height) || height <= 0) {
            errors.push({
              row: rowNumber,
              field: 'image_height',
              message: 'Image height must be a positive integer',
              value: row.image_height
            });
            rowIsValid = false;
          }
        }

        // Validate passage_id format if provided
        if (row.passage_id && row.passage_id.trim() !== '') {
          const passageId = row.passage_id.trim();
          // Check for valid format (alphanumeric, underscores, hyphens)
          if (!/^[A-Za-z0-9_-]+$/.test(passageId)) {
            errors.push({
              row: rowNumber,
              field: 'passage_id',
              message: 'Passage ID must contain only letters, numbers, underscores, and hyphens',
              value: row.passage_id
            });
            rowIsValid = false;
          }
        }

        // Check for duplicate question text
        if (row.question_text) {
          const questionText = row.question_text.trim().toLowerCase();
          if (questionTexts.has(questionText)) {
            duplicates.push(rowNumber);
            errors.push({
              row: rowNumber,
              field: 'question_text',
              message: 'Duplicate question text found in file',
              value: row.question_text
            });
            rowIsValid = false;
          } else {
            questionTexts.add(questionText);
          }
        }

        if (rowIsValid) {
          validRowIndices.push(index);
        }
      });

      // Check for existing questions in database
      if (questionTexts.size > 0) {
        const { data: existingQuestions } = await supabase
          .from('questions')
          .select('question_text')
          .in('question_text', Array.from(questionTexts));

        if (existingQuestions && existingQuestions.length > 0) {
          const existingTexts = new Set(existingQuestions.map((q: { question_text: string }) => q.question_text.toLowerCase()));
          rows.forEach((row, index) => {
            if (row.question_text && existingTexts.has(row.question_text.trim().toLowerCase())) {
              const rowNumber = index + 2;
              if (!duplicates.includes(rowNumber)) {
                duplicates.push(rowNumber);
                errors.push({
                  row: rowNumber,
                  field: 'question_text',
                  message: 'Question already exists in database',
                  value: row.question_text
                });
              }
            }
          });
        }
      }

      const result: ValidationResult = {
        totalRows: rows.length,
        validRows: validRowIndices.length,
        invalidRows: rows.length - validRowIndices.length,
        errors: errors.sort((a, b) => a.row - b.row),
        duplicates
      };

      return NextResponse.json(result);
    } catch (error) {
      console.error('Validation error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
