// CSV Template Download Route
import { NextResponse } from 'next/server';

export async function GET() {
  // CSV Template columns
  const columns = [
    'subject_id',
    'topic_id',
    'exam_type',
    'year',
    'difficulty',
    'question_text',
    'passage',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'correct_answer',
    'hint',
    'solution',
    'further_study_links'
  ];

  // Example rows
  const exampleRows = [
    {
      subject_id: 'example-uuid-1234-5678',
      topic_id: 'example-uuid-abcd-efgh',
      exam_type: 'WAEC',
      year: '2023',
      difficulty: 'medium',
      question_text: 'What is the capital of Nigeria?',
      passage: '',
      option_a: 'Lagos',
      option_b: 'Abuja',
      option_c: 'Kano',
      option_d: 'Port Harcourt',
      option_e: '',
      correct_answer: 'B',
      hint: 'It became the capital in 1991',
      solution: 'Abuja became the capital of Nigeria on December 12, 1991, replacing Lagos.',
      further_study_links: 'https://example.com/nigerian-history'
    },
    {
      subject_id: 'example-uuid-1234-5678',
      topic_id: 'example-uuid-abcd-efgh',
      exam_type: 'JAMB',
      year: '2024',
      difficulty: 'hard',
      question_text: 'Read the passage below and answer the question:\n\nThe young boy ran through the forest...',
      passage: 'The young boy ran through the forest, his heart pounding with fear. Behind him, he could hear the hunters approaching. He knew he had to find shelter before nightfall.',
      option_a: 'He was afraid',
      option_b: 'He was excited',
      option_c: 'He was calm',
      option_d: 'He was angry',
      option_e: 'He was happy',
      correct_answer: 'A',
      hint: 'Consider the boy\'s emotional state based on the context',
      solution: 'The passage explicitly states "his heart pounding with fear", indicating the boy was afraid.',
      further_study_links: 'https://example.com/reading-comprehension,https://example.com/context-clues'
    },
    {
      subject_id: 'example-uuid-math-9876',
      topic_id: 'example-uuid-algebra-5432',
      exam_type: 'NECO',
      year: '2023',
      difficulty: 'easy',
      question_text: 'Solve for x: 2x + 5 = 15',
      passage: '',
      option_a: '5',
      option_b: '10',
      option_c: '7.5',
      option_d: '20',
      option_e: '',
      correct_answer: 'A',
      hint: 'Subtract 5 from both sides first',
      solution: '2x + 5 = 15\n2x = 15 - 5\n2x = 10\nx = 10/2\nx = 5',
      further_study_links: 'https://example.com/basic-algebra'
    }
  ];

  // Build CSV content
  let csvContent = '# SabiPrep Question Import Template\n';
  csvContent += '# Instructions:\n';
  csvContent += '# 1. Fill in the rows below with your question data\n';
  csvContent += '# 2. Required fields: subject_id, topic_id, exam_type, year, question_text, option_a, option_b, correct_answer\n';
  csvContent += '# 3. Optional fields: difficulty, passage, option_c, option_d, option_e, hint, solution, further_study_links\n';
  csvContent += '# 4. exam_type must be one of: WAEC, JAMB, NECO, GCE\n';
  csvContent += '# 5. difficulty must be one of: easy, medium, hard (default: medium)\n';
  csvContent += '# 6. correct_answer must be one of: A, B, C, D, E\n';
  csvContent += '# 7. For multiple study links, separate with commas\n';
  csvContent += '# 8. Remove these comment lines (starting with #) before uploading\n';
  csvContent += '# 9. Keep the header row below\n';
  csvContent += '\n';

  // Add header row
  csvContent += columns.join(',') + '\n';

  // Add example rows
  exampleRows.forEach(row => {
    const values = columns.map(col => {
      const value = row[col as keyof typeof row] || '';
      // Escape quotes and wrap in quotes if contains comma or newline
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  // Create response with CSV download
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="sabiprep_question_import_template_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
