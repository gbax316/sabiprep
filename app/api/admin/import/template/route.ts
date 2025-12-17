// CSV Template Download Route
import { NextResponse } from 'next/server';

export async function GET() {
  // CSV Template columns - now using subject/topic names instead of UUIDs
  const columns = [
    'subject',
    'topic',
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

  // Example rows with subject/topic names
  const exampleRows = [
    {
      subject: 'Mathematics',
      topic: 'Algebra',
      exam_type: 'WAEC',
      year: '2023',
      difficulty: 'medium',
      question_text: 'Solve for x: 2x + 5 = 13',
      passage: '',
      passage_id: '',
      question_image_url: '',
      image_alt_text: '',
      image_width: '',
      image_height: '',
      option_a: 'x = 3',
      option_b: 'x = 4',
      option_c: 'x = 5',
      option_d: 'x = 6',
      option_e: '',
      correct_answer: 'B',
      hint: 'Subtract 5 from both sides first',
      solution: '2x + 5 = 13, subtract 5: 2x = 8, divide by 2: x = 4',
      further_study_links: 'https://example.com/algebra-basics'
    },
    {
      subject: 'English',
      topic: 'Comprehension',
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
      subject: 'Mathematics',
      topic: 'Geometry',
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
  csvContent += '# 2. Required fields: subject, topic, exam_type, year, question_text, option_a, option_b, correct_answer\n';
  csvContent += '# 3. Use subject/topic NAMES (e.g., "Mathematics", "English") - NOT UUIDs\n';
  csvContent += '# 4. Optional fields: difficulty, passage, passage_id, question_image_url, image_alt_text, image_width, image_height, option_c, option_d, option_e, hint, solution, further_study_links\n';
  csvContent += '# 5. exam_type must be one of: WAEC, JAMB, NECO, GCE\n';
  csvContent += '# 6. difficulty must be one of: easy, medium, hard (default: medium)\n';
  csvContent += '# 7. correct_answer must be one of: A, B, C, D, E\n';
  csvContent += '# 8. passage: Use for comprehension questions; can be shared across multiple questions using passage_id\n';
  csvContent += '# 9. passage_id: Optional identifier to group questions that share the same passage\n';
  csvContent += '# 10. question_image_url: URL to an image for the question (diagrams, charts, etc.)\n';
  csvContent += '# 11. image_alt_text: Required if question_image_url is provided (for accessibility)\n';
  csvContent += '# 12. image_width, image_height: Optional dimensions in pixels for the image\n';
  csvContent += '# 13. For multiple study links, separate with commas\n';
  csvContent += '# 14. Remove these comment lines (starting with #) before uploading\n';
  csvContent += '# 15. Keep the header row below\n';
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
