# Taxonomy standard: the topic tree for a subject

The bar every subject's tree must clear before its gate. The taxonomy worker
builds to it, the coverage map and the placement test check it, and Orezi
approves it at the gate. Set 2026-09-29 from Orezi's direction: the tree
matches the WAEC and JAMB syllabi and the senior secondary scheme of work,
gives a student a bird's-eye view of everything they need, and breaks each
topic into subtopics for wider and deeper knowledge.

## What the tree is for

Mastery. A student's progress is tracked per subtopic, and the app shows it
rolled up to topics. So the tree does two jobs at once:

- **The bird's-eye view.** The topics, read top to bottom, are the whole body
  of knowledge for the subject, in an order a teacher would recognise. A
  student who has mastered every topic has covered everything either exam can
  ask.
- **The depth.** Each topic breaks into subtopics, each one thing a student
  can be good or bad at, so a weak score points at something specific to
  practise.

## Sources, all three, every time

1. The WAEC (WASSCE) syllabus.
2. The JAMB (UTME) syllabus.
3. The senior secondary scheme of work, SS1 to SS3, term by term (NERDC-based;
   the Lagos unified scheme is the most widely mirrored). It carries the
   teaching order and the enrichment topics the syllabi leave implicit.

Each is saved under `syllabi/` with a provenance header: where it came from,
when, and how far it can be trusted. A third-party copy is acceptable when its
topic list is confirmed against a second copy.

## Shape

- Topics follow the syllabi's own numbered topics, merged where WAEC and JAMB
  name the same content. Most topics hold two to six subtopics.
- A subtopic is one skill or body of knowledge. If a teacher would teach it as
  two lessons needing different skills, it is two subtopics. If no real
  question could tell two subtopics apart, they are one.
- Every subtopic cites its syllabus references for each exam (`null` where an
  exam does not cover it) and has a `covers` line in plain words.
- Where two subtopics border each other, the `covers` line says which one a
  borderline question goes to. A border without a sorting rule is a defect,
  because the placement test will split on it.
- Real papers override a syllabus's stated scope. Content the papers test goes
  in, and `source.scope_rule` says so.
- Every legacy database topic is folded in: a specific name to its subtopic, a
  generic one to its topic.

## What proves it

Three checks, all run before the gate, all shown on the gate page.

1. **Coverage map** (`work/coverage/<subject>.json`). Every item of all three
   sources maps to a subtopic, or is listed as missing with a proposed home.
   The bar: no syllabus item missing; scheme-of-work items missing only where
   they are genuinely outside the subject (a civics week in an Economics
   scheme). Every subtopic has at least one source item behind it, or a stated
   reason for existing (a real paper tests it).
2. **Placement test** (`python run.py matchtest <slug>`). Eighty questions from
   across every year, placed twice, independently, by two models. The bar: at
   least 90 percent agree on the subtopic and 95 percent on the topic, and
   every disagreement is either explained by a sorting rule added to the tree
   or accepted as a genuinely two-sided question.
3. **Legacy fold.** Every live database topic for the subject maps to an id
   that exists.

A tree that misses a bar is revised and re-tested once. If it still misses,
the gate page says where and why, and Orezi decides.

## Findings from the first two trees

Economics 1.0, placement test on 80 UTME questions across 11 years: 91 percent
same subtopic, 95 percent same topic. Both models, independently, found the
same three missing concepts (stock and flow variables, the Phillips curve,
open and closed economies) and the same unsorted borders. Coverage: all 105
WAEC items, 123 of 126 JAMB items fully, 78 of 85 scheme-of-work weeks fully,
one missing (comparative development lessons, SS3). That is what a good tree's
first test looks like: close, with specific, fixable holes.
