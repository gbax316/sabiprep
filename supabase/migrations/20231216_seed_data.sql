-- SABIPREP Seed Data
-- Sample data for subjects, topics, questions, and achievements

-- ============================================
-- SUBJECTS
-- ============================================
INSERT INTO public.subjects (name, slug, description, icon, color, exam_types, total_questions) VALUES
('Mathematics', 'mathematics', 'Core mathematics for JAMB, WAEC, and NECO', '📐', '#3B82F6', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('English Language', 'english', 'English language comprehension and grammar', '📚', '#10B981', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Physics', 'physics', 'Fundamental physics concepts and applications', '⚛️', '#8B5CF6', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Chemistry', 'chemistry', 'Chemical reactions, elements, and compounds', '🧪', '#F59E0B', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Biology', 'biology', 'Life sciences and biological systems', '🧬', '#EF4444', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Economics', 'economics', 'Economic principles and market systems', '💰', '#06B6D4', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Government', 'government', 'Political systems and governance', '🏛️', '#6366F1', ARRAY['JAMB', 'WAEC', 'NECO'], 0),
('Literature', 'literature', 'Literary analysis and appreciation', '📖', '#EC4899', ARRAY['JAMB', 'WAEC', 'NECO'], 0)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- TOPICS (Mathematics)
-- ============================================
INSERT INTO public.topics (subject_id, name, slug, description, difficulty, total_questions)
SELECT 
  s.id,
  t.name,
  t.slug,
  t.description,
  t.difficulty,
  0
FROM public.subjects s
CROSS JOIN (VALUES
  ('Algebra', 'algebra', 'Equations, inequalities, and algebraic expressions', 'Medium'),
  ('Geometry', 'geometry', 'Shapes, angles, and spatial relationships', 'Medium'),
  ('Trigonometry', 'trigonometry', 'Sine, cosine, tangent, and their applications', 'Hard'),
  ('Calculus', 'calculus', 'Differentiation and integration', 'Hard'),
  ('Statistics', 'statistics', 'Data analysis, probability, and distributions', 'Easy'),
  ('Number Systems', 'number-systems', 'Integers, fractions, decimals, and number theory', 'Easy')
) AS t(name, slug, description, difficulty)
WHERE s.slug = 'mathematics'
ON CONFLICT (subject_id, slug) DO NOTHING;

-- ============================================
-- TOPICS (English Language)
-- ============================================
INSERT INTO public.topics (subject_id, name, slug, description, difficulty, total_questions)
SELECT 
  s.id,
  t.name,
  t.slug,
  t.description,
  t.difficulty,
  0
FROM public.subjects s
CROSS JOIN (VALUES
  ('Comprehension', 'comprehension', 'Reading comprehension and passage analysis', 'Medium'),
  ('Grammar', 'grammar', 'Parts of speech, tenses, and sentence structure', 'Easy'),
  ('Vocabulary', 'vocabulary', 'Word meanings, synonyms, and antonyms', 'Easy'),
  ('Essay Writing', 'essay-writing', 'Composition and essay structure', 'Medium'),
  ('Oral English', 'oral-english', 'Pronunciation and phonetics', 'Medium')
) AS t(name, slug, description, difficulty)
WHERE s.slug = 'english'
ON CONFLICT (subject_id, slug) DO NOTHING;

-- ============================================
-- TOPICS (Physics)
-- ============================================
INSERT INTO public.topics (subject_id, name, slug, description, difficulty, total_questions)
SELECT 
  s.id,
  t.name,
  t.slug,
  t.description,
  t.difficulty,
  0
FROM public.subjects s
CROSS JOIN (VALUES
  ('Mechanics', 'mechanics', 'Motion, forces, and energy', 'Medium'),
  ('Electricity', 'electricity', 'Current, voltage, and circuits', 'Medium'),
  ('Waves', 'waves', 'Sound, light, and wave properties', 'Medium'),
  ('Thermodynamics', 'thermodynamics', 'Heat, temperature, and energy transfer', 'Hard'),
  ('Modern Physics', 'modern-physics', 'Atomic structure and quantum mechanics', 'Hard')
) AS t(name, slug, description, difficulty)
WHERE s.slug = 'physics'
ON CONFLICT (subject_id, slug) DO NOTHING;

-- ============================================
-- SAMPLE QUESTIONS (Mathematics - Algebra)
-- ============================================
INSERT INTO public.questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
SELECT 
  s.id AS subject_id,
  t.id AS topic_id,
  q.question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_answer,
  q.explanation,
  q.hint,
  q.difficulty,
  q.exam_type,
  q.exam_year
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
CROSS JOIN (VALUES
  ('Solve for x: 2x + 5 = 15', 'x = 5', 'x = 10', 'x = 7.5', 'x = 20', 'A', 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5', 'Start by isolating the term with x', 'Easy', 'JAMB', 2023),
  ('If 3x - 7 = 2x + 5, what is the value of x?', 'x = 12', 'x = 2', 'x = -2', 'x = 6', 'A', 'Subtract 2x from both sides: x - 7 = 5, then add 7: x = 12', 'Move all x terms to one side', 'Easy', 'JAMB', 2023),
  ('Simplify: (x + 3)(x - 3)', 'x² - 9', 'x² + 9', 'x² - 6x + 9', 'x² + 6x - 9', 'A', 'Use the difference of squares formula: (a+b)(a-b) = a² - b²', 'Remember the difference of squares pattern', 'Medium', 'WAEC', 2022),
  ('If f(x) = 2x² + 3x - 5, find f(2)', '9', '11', '13', '15', 'A', 'Substitute x = 2: f(2) = 2(2)² + 3(2) - 5 = 2(4) + 6 - 5 = 8 + 6 - 5 = 9', 'Replace x with 2 in the function', 'Medium', 'JAMB', 2023),
  ('Solve the quadratic equation: x² - 5x + 6 = 0', 'x = 2 or x = 3', 'x = 1 or x = 6', 'x = -2 or x = -3', 'x = 5 or x = 1', 'A', 'Factor: (x - 2)(x - 3) = 0, so x = 2 or x = 3', 'Try factoring the quadratic', 'Medium', 'NECO', 2022)
) AS q(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
WHERE s.slug = 'mathematics' AND t.slug = 'algebra';

-- ============================================
-- SAMPLE QUESTIONS (English - Grammar)
-- ============================================
INSERT INTO public.questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
SELECT 
  s.id AS subject_id,
  t.id AS topic_id,
  q.question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_answer,
  q.explanation,
  q.hint,
  q.difficulty,
  q.exam_type,
  q.exam_year
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
CROSS JOIN (VALUES
  ('Choose the correct verb form: She _____ to school every day.', 'go', 'goes', 'going', 'gone', 'B', 'With third person singular subjects (she, he, it), we add -s or -es to the verb in present simple tense', 'Think about subject-verb agreement', 'Easy', 'JAMB', 2023),
  ('Identify the noun in this sentence: The cat sleeps on the mat.', 'sleeps', 'cat', 'on', 'the', 'B', 'A noun is a person, place, thing, or idea. "Cat" is a thing (animal)', 'Look for words that name things', 'Easy', 'WAEC', 2023),
  ('Which sentence is grammatically correct?', 'He don''t like apples', 'He doesn''t likes apples', 'He doesn''t like apples', 'He don''t likes apples', 'C', 'The correct form is "doesn''t" (does not) with the base form of the verb "like"', 'Check the auxiliary verb and main verb forms', 'Easy', 'JAMB', 2022),
  ('Choose the correct preposition: She arrived _____ the airport at 6 PM.', 'in', 'at', 'on', 'to', 'B', 'We use "at" for specific points or locations like airports, stations, etc.', 'Think about prepositions of place', 'Medium', 'NECO', 2023),
  ('Identify the adjective: The beautiful flowers bloomed in spring.', 'flowers', 'beautiful', 'bloomed', 'spring', 'B', 'An adjective describes a noun. "Beautiful" describes the flowers', 'Look for words that describe nouns', 'Easy', 'WAEC', 2022)
) AS q(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
WHERE s.slug = 'english' AND t.slug = 'grammar';

-- ============================================
-- SAMPLE QUESTIONS (Physics - Mechanics)
-- ============================================
INSERT INTO public.questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
SELECT 
  s.id AS subject_id,
  t.id AS topic_id,
  q.question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_answer,
  q.explanation,
  q.hint,
  q.difficulty,
  q.exam_type,
  q.exam_year
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
CROSS JOIN (VALUES
  ('What is the SI unit of force?', 'Joule', 'Newton', 'Watt', 'Pascal', 'B', 'The Newton (N) is the SI unit of force, named after Isaac Newton', 'Think about Newton''s laws', 'Easy', 'JAMB', 2023),
  ('A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?', '2 m/s²', '4 m/s²', '5 m/s²', '10 m/s²', 'B', 'Acceleration = (final velocity - initial velocity) / time = (20 - 0) / 5 = 4 m/s²', 'Use the formula: a = (v - u) / t', 'Medium', 'WAEC', 2023),
  ('What is Newton''s First Law of Motion?', 'F = ma', 'Every action has an equal and opposite reaction', 'An object at rest stays at rest unless acted upon by a force', 'Energy cannot be created or destroyed', 'C', 'Newton''s First Law states that an object will remain at rest or in uniform motion unless acted upon by an external force', 'This is also called the law of inertia', 'Easy', 'JAMB', 2022),
  ('Calculate the kinetic energy of a 2 kg object moving at 3 m/s.', '6 J', '9 J', '12 J', '18 J', 'B', 'KE = ½mv² = ½(2)(3)² = ½(2)(9) = 9 J', 'Use the formula: KE = ½mv²', 'Medium', 'NECO', 2023),
  ('What is the weight of a 5 kg object on Earth? (g = 10 m/s²)', '5 N', '10 N', '50 N', '500 N', 'C', 'Weight = mass × gravity = 5 kg × 10 m/s² = 50 N', 'Weight = mg', 'Easy', 'WAEC', 2022)
) AS q(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, exam_type, exam_year)
WHERE s.slug = 'physics' AND t.slug = 'mechanics';

-- ============================================
-- UPDATE QUESTION COUNTS
-- ============================================
-- Update total_questions for topics
UPDATE public.topics t
SET total_questions = (
  SELECT COUNT(*) FROM public.questions q WHERE q.topic_id = t.id
);

-- Update total_questions for subjects
UPDATE public.subjects s
SET total_questions = (
  SELECT COUNT(*) FROM public.questions q WHERE q.subject_id = s.id
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value) VALUES
('First Steps', 'Answer your first question', '🎯', 'questions_answered', 1),
('Getting Started', 'Answer 10 questions', '📚', 'questions_answered', 10),
('Dedicated Learner', 'Answer 50 questions', '🌟', 'questions_answered', 50),
('Century Club', 'Answer 100 questions', '💯', 'questions_answered', 100),
('Master Scholar', 'Answer 500 questions', '🏆', 'questions_answered', 500),
('Streak Starter', 'Maintain a 3-day streak', '🔥', 'streak', 3),
('Week Warrior', 'Maintain a 7-day streak', '⚡', 'streak', 7),
('Month Master', 'Maintain a 30-day streak', '👑', 'streak', 30),
('Accuracy Ace', 'Achieve 80% accuracy on 20+ questions', '🎯', 'accuracy', 80),
('Perfect Score', 'Get 100% on a test', '⭐', 'accuracy', 100)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify data after migration

-- SELECT 'Subjects' as table_name, COUNT(*) as count FROM public.subjects
-- UNION ALL
-- SELECT 'Topics', COUNT(*) FROM public.topics
-- UNION ALL
-- SELECT 'Questions', COUNT(*) FROM public.questions
-- UNION ALL
-- SELECT 'Achievements', COUNT(*) FROM public.achievements;

-- SELECT s.name as subject, COUNT(q.id) as question_count
-- FROM public.subjects s
-- LEFT JOIN public.questions q ON q.subject_id = s.id
-- GROUP BY s.name
-- ORDER BY s.name;
