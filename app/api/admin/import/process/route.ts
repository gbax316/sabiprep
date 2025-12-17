// CSV Import Process Route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, logAdminAction, type AdminApiUser } from '@/lib/api/admin-auth';
import Papa from 'papaparse';

interface ImportRow {
  subject: string;
  topic: string;
  exam_type: string;
  year: string;
  difficulty?: string;
  question_text: string;
  passage?: string;
  passage_id?: string;
  question_image_url?: string;
  image_alt_text?: string;
  image_width?: string;
  image_height?: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer: string;
  hint?: string;
  solution?: string;
  further_study_links?: string;
}

interface ProcessResult {
  reportId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();
      
      // Get request data
      const body = await req.json();
      const { csvContent, filename, fileSize, validRowsOnly = true } = body;

      if (!csvContent || !filename) {
        return NextResponse.json(
          { error: 'CSV content and filename are required' },
          { status: 400 }
        );
      }

      // Parse CSV
      const parseResult = Papa.parse<ImportRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        comments: '#'
      });

      if (parseResult.errors.length > 0) {
        return NextResponse.json({
          error: 'CSV parsing error',
          details: parseResult.errors
        }, { status: 400 });
      }

      const rows = parseResult.data;

      // Fetch subjects and topics for name-to-ID lookup
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, slug');
      
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name, slug, subject_id');

      // Create lookup maps (case-insensitive)
      const subjectByName = new Map<string, string>();
      const subjectBySlug = new Map<string, string>();
      subjects?.forEach((s: { id: string; name: string; slug: string }) => {
        subjectByName.set(s.name.toLowerCase(), s.id);
        subjectBySlug.set(s.slug.toLowerCase(), s.id);
      });

      const topicByName = new Map<string, string>();
      const topicBySlug = new Map<string, string>();
      topics?.forEach((t: { id: string; name: string; slug: string }) => {
        topicByName.set(t.name.toLowerCase(), t.id);
        topicBySlug.set(t.slug.toLowerCase(), t.id);
      });

      console.log('[DEBUG] Import: Loaded', subjectByName.size, 'subjects and', topicByName.size, 'topics');

      // Create import report entry
      const { data: importReport, error: reportError } = await supabase
        .from('import_reports')
        .insert({
          admin_id: adminUser.id,
          filename,
          file_size_bytes: fileSize || 0,
          total_rows: rows.length,
          successful_rows: 0,
          failed_rows: 0,
          status: 'processing',
          import_type: 'questions',
          error_details: []
        })
        .select()
        .single();

      if (reportError || !importReport) {
        console.error('Error creating import report:', reportError);
        return NextResponse.json({
          error: 'Failed to create import report'
        }, { status: 500 });
      }

      // Process rows
      const errors: { row: number; error: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process in batches of 50
      const batchSize = 50;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        const insertPromises = batch.map(async (row, batchIndex) => {
          const rowNumber = i + batchIndex + 2; // +2 for header and 0-index
          
          try {
            // Look up subject and topic IDs
            const subjectKey = row.subject.trim().toLowerCase();
            const subjectId = subjectByName.get(subjectKey) || subjectBySlug.get(subjectKey);
            
            if (!subjectId) {
              throw new Error(`Subject not found: ${row.subject}`);
            }

            const topicKey = row.topic.trim().toLowerCase();
            const topicId = topicByName.get(topicKey) || topicBySlug.get(topicKey);
            
            if (!topicId) {
              throw new Error(`Topic not found: ${row.topic}`);
            }

            // Process further_study_links
            let studyLinks: string[] | null = null;
            if (row.further_study_links) {
              studyLinks = row.further_study_links
                .split(',')
                .map((link: string) => link.trim())
                .filter((link: string) => link.length > 0);
            }

            // Normalize difficulty
            const difficulty = row.difficulty
              ? row.difficulty.charAt(0).toUpperCase() + row.difficulty.slice(1).toLowerCase()
              : 'Medium';

            // Validate image alt text if image URL is provided
            if (row.question_image_url && !row.image_alt_text) {
              throw new Error('Image alt text is required when question image URL is provided');
            }

            // Parse image dimensions
            const imageWidth = row.image_width ? parseInt(row.image_width) : null;
            const imageHeight = row.image_height ? parseInt(row.image_height) : null;

            // Insert question
            const { error: insertError } = await supabase
              .from('questions')
              .insert({
                subject_id: subjectId,
                topic_id: topicId,
                question_text: row.question_text.trim(),
                passage: row.passage?.trim() || null,
                passage_id: row.passage_id?.trim() || null,
                question_image_url: row.question_image_url?.trim() || null,
                image_alt_text: row.image_alt_text?.trim() || null,
                image_width: imageWidth,
                image_height: imageHeight,
                option_a: row.option_a.trim(),
                option_b: row.option_b.trim(),
                option_c: row.option_c?.trim() || null,
                option_d: row.option_d?.trim() || null,
                option_e: row.option_e?.trim() || null,
                correct_answer: row.correct_answer.trim().toUpperCase(),
                explanation: null, // Can be added later
                hint: row.hint?.trim() || null,
                solution: row.solution?.trim() || null,
                further_study_links: studyLinks,
                difficulty,
                exam_type: row.exam_type.trim().toUpperCase(),
                exam_year: parseInt(row.year),
                status: 'published', // Default to published for imported questions
                created_by: adminUser.id
              });

            if (insertError) {
              throw insertError;
            }

            return { success: true, rowNumber };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
              success: false,
              rowNumber,
              error: errorMessage
            };
          }
        });

        const results = await Promise.all(insertPromises);
        
        results.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            if ('error' in result && result.error) {
              errors.push({
                row: result.rowNumber,
                error: result.error
              });
            }
          }
        });
      }

      // Update import report
      const { error: updateError } = await supabase
        .from('import_reports')
        .update({
          successful_rows: successCount,
          failed_rows: failCount,
          status: failCount === 0 ? 'completed' : 'completed',
          error_details: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', importReport.id);

      if (updateError) {
        console.error('Error updating import report:', updateError);
      }

      // Log admin action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'CREATE', // Using CREATE as the closest action type for imports
        entity_type: 'import',
        entity_id: importReport.id,
        details: {
          filename,
          totalRows: rows.length,
          successfulRows: successCount,
          failedRows: failCount,
          hasErrors: errors.length > 0
        }
      }, req);

      const result: ProcessResult = {
        reportId: importReport.id,
        totalRows: rows.length,
        successfulRows: successCount,
        failedRows: failCount,
        errors
      };

      return NextResponse.json(result);
    } catch (error) {
      console.error('Import processing error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
