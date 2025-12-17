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
    'passage_id',
    'question_image_url',
    'image_alt_text',
    'image_width',
    'image_height',
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
      passage_id: '',
      question_image_url: '',
      image_alt_text: '',
      image_width: '',
      image_height: '',
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
      topic_id: 'example-uuid-english-comp',
      exam_type: 'JAMB',
      year: '2024',
      difficulty: 'hard',
      question_text: 'What emotion does the boy experience in the passage?',
      passage: 'The young boy ran through the forest, his heart pounding with fear. Behind him, he could hear the hunters approaching. He knew he had to find shelter before nightfall.',
      passage_id: 'PASSAGE_ENG_001',
      question_image_url: '',
      image_alt_text: '',
      image_width: '',
      image_height: '',
      option_a: 'He was afraid',
      option_b: 'He was excited',
      option_c: 'He was calm',
      option_d: 'He was angry',
      option_e: '',
      correct_answer: 'A',
      hint: 'Look for emotional descriptors in the text',
      solution: 'The passage explicitly states "his heart pounding with fear", indicating the boy was afraid.',
      further_study_links: 'https://example.com/reading-comprehension'
    },
    {
      subject_id: 'example-uuid-math-9876',
      topic_id: 'example-uuid-geometry-5432',
      exam_type: 'NECO',
      year: '2023',
      difficulty: 'medium',
      question_text: 'What is the measure of angle ABC in the diagram?',
      passage: '',
      passage_id: '',
      question_image_url: 'https://example.com/images/triangle-abc.png',
      image_alt_text: 'Right triangle ABC with angle A marked as 30 degrees and angle C marked as 60 degrees',
      image_width: '400',
      image_height: '300',
      option_a: '30°',
      option_b: '60°',
      option_c: '90°',
      option_d: '120°',
      option_e: '',
      correct_answer: 'C',
      hint: 'Remember that angles in a triangle sum to 180°',
      solution: 'Using the triangle angle sum property: 30° + 60° + angle B = 180°, therefore angle B = 90°',
      further_study_links: 'https://example.com/triangle-properties'
    }
  ];

  // Build CSV content
  let csvContent = '# SabiPrep Question Import Template\n';
  csvContent += '# Instructions:\n';
  csvContent += '# 1. Fill in the rows below with your question data\n';
  csvContent += '# 2. Required fields: subject_id, topic_id, exam_type, year, question_text, option_a, option_b, correct_answer\n';
  csvContent += '# 3. Optional fields: difficulty, passage, passage_id, question_image_url, image_alt_text, image_width, image_height, option_c, option_d, option_e, hint, solution, further_study_links\n';
  csvContent += '# 4. exam_type must be one of: WAEC, JAMB, NECO, GCE\n';
  csvContent += '# 5. difficulty must be one of: easy, medium, hard (default: medium)\n';
  csvContent += '# 6. correct_answer must be one of: A, B, C, D, E\n';
  csvContent += '# 7. passage: Use for comprehension questions; can be shared across multiple questions using passage_id\n';
  csvContent += '# 8. passage_id: Optional identifier to group questions that share the same passage\n';
  csvContent += '# 9. question_image_url: URL to an image for the question (diagrams, charts, etc.)\n';
  csvContent += '# 10. image_alt_text: Required if question_image_url is provided (for accessibility)\n';
  csvContent += '# 11. image_width, image_height: Optional dimensions in pixels for the image\n';
  csvContent += '# 12. For multiple study links, separate with commas\n';
  csvContent += '# 13. Remove these comment lines (starting with #) before uploading\n';
  csvContent += '# 14. Keep the header row below\n';
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
