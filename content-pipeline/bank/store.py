"""
The bank's tables and views, and writing them. The file is written whole under
a temporary name and swapped in, so a reader never meets half a build.

These tables are the shape the v2 app's content tables take (blueprint/PLAN.md:
papers, questions with their position, passages), so the bank is also the
rehearsal for that migration.
"""

import os, sqlite3

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE exams (exam TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE subjects (subject TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE topics (topic_key TEXT PRIMARY KEY, topic_id TEXT NOT NULL, subject TEXT NOT NULL REFERENCES subjects,
                     name TEXT NOT NULL,
                     part TEXT, syllabus_waec TEXT, syllabus_jamb TEXT, syllabus_note TEXT,
                     position INTEGER, active INTEGER NOT NULL);
CREATE TABLE subtopics (subtopic_key TEXT PRIMARY KEY, subtopic_id TEXT NOT NULL,
                        topic_key TEXT NOT NULL REFERENCES topics, name TEXT NOT NULL,
                        syllabus_waec TEXT, syllabus_jamb TEXT, syllabus_note TEXT, covers TEXT,
                        position INTEGER, active INTEGER NOT NULL);
CREATE TABLE papers (paper_key TEXT PRIMARY KEY, exam TEXT NOT NULL REFERENCES exams,
                     subject TEXT NOT NULL REFERENCES subjects, year INTEGER NOT NULL, paper_no INTEGER NOT NULL,
                     paper_name TEXT NOT NULL, pipeline_slug TEXT NOT NULL, question_count INTEGER NOT NULL,
                     run_status TEXT NOT NULL, UNIQUE (exam, subject, year, paper_no));
CREATE TABLE passages (passage_key TEXT PRIMARY KEY, paper_key TEXT NOT NULL REFERENCES papers,
                       kind TEXT NOT NULL CHECK (kind IN ('passage', 'cloze', 'set-text', 'shared-stem')),
                       text TEXT NOT NULL, first_question INTEGER, last_question INTEGER);
CREATE TABLE questions (question_key TEXT PRIMARY KEY, paper_key TEXT NOT NULL REFERENCES papers,
                        position INTEGER NOT NULL, passage_key TEXT REFERENCES passages,
                        origin TEXT NOT NULL, stem TEXT NOT NULL,
                        option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, option_e TEXT,
                        options_are_images INTEGER NOT NULL, diagram_files TEXT,
                        answer TEXT, answer_basis TEXT, paper_key_letter TEXT,
                        status TEXT NOT NULL CHECK (status IN ('passed', 'separated', 'waiting')),
                        separated_why TEXT, subtopic_key TEXT REFERENCES subtopics, difficulty TEXT,
                        hint1 TEXT, hint2 TEXT, hint3 TEXT, solution TEXT,
                        UNIQUE (paper_key, position));
CREATE TABLE solution_parts (question_key TEXT NOT NULL REFERENCES questions, ord INTEGER NOT NULL,
                             part TEXT NOT NULL CHECK (part IN ('answer', 'principle', 'step', 'why_not', 'tip')),
                             option TEXT, text TEXT NOT NULL, PRIMARY KEY (question_key, ord));
CREATE TABLE checks (check_id TEXT PRIMARY KEY, applies TEXT NOT NULL, severity TEXT NOT NULL,
                     what TEXT NOT NULL, fix_goes_to TEXT NOT NULL);
CREATE TABLE check_failures (question_key TEXT NOT NULL REFERENCES questions,
                             check_id TEXT NOT NULL REFERENCES checks, detail TEXT,
                             PRIMARY KEY (question_key, check_id));
CREATE INDEX q_subtopic ON questions (subtopic_key);
CREATE INDEX q_status ON questions (status);
CREATE INDEX p_year ON papers (subject, exam, year);

-- How often each subtopic is examined, per exam and year: the pattern view.
CREATE VIEW topic_by_year AS
  SELECT p.subject, p.exam, t.name AS topic, s.subtopic_key, s.name AS subtopic, p.year,
         COUNT(*) AS questions
  FROM questions q JOIN papers p USING (paper_key)
  JOIN subtopics s USING (subtopic_key) JOIN topics t USING (topic_key)
  GROUP BY p.subject, p.exam, s.subtopic_key, p.year;

-- Each subtopic's record across the years: how often, since when, how long ago.
CREATE VIEW subtopic_history AS
  SELECT tby.subject, tby.exam, tby.topic, tby.subtopic, tby.subtopic_key,
         COUNT(*) AS years_examined, MIN(tby.year) AS first_year, MAX(tby.year) AS last_year,
         (SELECT MAX(year) FROM papers p2 WHERE p2.subject = tby.subject AND p2.exam = tby.exam) - MAX(tby.year)
           AS years_since, SUM(tby.questions) AS questions,
         GROUP_CONCAT(tby.year || ':' || tby.questions, ' ') AS per_year
  FROM (SELECT * FROM topic_by_year ORDER BY year) tby
  GROUP BY tby.subject, tby.exam, tby.subtopic_key;

-- Subtopics on the tree that no passed question covers yet.
CREATE VIEW subtopic_gaps AS
  SELECT t.subject, t.name AS topic, s.subtopic_key, s.name AS subtopic
  FROM subtopics s JOIN topics t USING (topic_key)
  WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.subtopic_key = s.subtopic_key);

-- The same question text in more than one paper.
CREATE VIEW repeated_stems AS
  SELECT LOWER(TRIM(stem)) AS stem, COUNT(*) AS times, GROUP_CONCAT(question_key, ' ') AS questions
  FROM questions WHERE LENGTH(stem) > 40
  GROUP BY LOWER(TRIM(stem)) HAVING COUNT(DISTINCT paper_key) > 1;

-- Each question with its paper, ready to read.
CREATE VIEW question_full AS
  SELECT p.exam, p.subject, p.year, p.paper_no, p.paper_name, q.*, ps.text AS passage_text,
         s.name AS subtopic, t.name AS topic
  FROM questions q JOIN papers p USING (paper_key) LEFT JOIN passages ps USING (passage_key)
  LEFT JOIN subtopics s USING (subtopic_key) LEFT JOIN topics t USING (topic_key);
"""

COLUMNS = {}      # table -> column order, read from the schema once


def _columns(db, table):
    if table not in COLUMNS:
        COLUMNS[table] = [r[1] for r in db.execute(f'PRAGMA table_info({table})')]
    return COLUMNS[table]


def write(path, data, checks, failures, meta):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.executescript(SCHEMA)
    db.execute('PRAGMA foreign_keys = ON')
    for table in ('exams', 'subjects', 'topics', 'subtopics', 'papers', 'passages', 'questions'):
        cols = _columns(db, table)
        db.executemany(f'INSERT INTO {table} ({", ".join(cols)}) VALUES ({", ".join("?" * len(cols))})',
                       [tuple(r.get(c) for c in cols) for r in data[table]])
    db.executemany('INSERT INTO solution_parts VALUES (?, ?, ?, ?, ?)',
                   [(q['question_key'], n, x['part'], x['option'], x['text'])
                    for q in data['questions'] for n, x in enumerate(q['parts'])])
    db.executemany('INSERT INTO checks VALUES (?, ?, ?, ?, ?)',
                   [(c['id'], c['applies'], c['severity'], c['what'], c['fix']) for c in checks])
    db.executemany('INSERT INTO check_failures VALUES (?, ?, ?)', failures)
    db.executemany('INSERT INTO meta VALUES (?, ?)', [(k, str(v)) for k, v in
                                                     {**meta, 'schema_version': SCHEMA_VERSION}.items()])
    bad = db.execute('PRAGMA foreign_key_check').fetchall()
    if bad:
        db.close()
        os.remove(tmp)
        raise SystemExit(f'bank not written: {len(bad)} broken references, first {bad[0]}')
    db.commit()
    db.close()
    os.replace(tmp, path)
