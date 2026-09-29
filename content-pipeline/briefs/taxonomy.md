You are building the topic taxonomy for {{subject}} on SabiPrep, an exam-practice app for Nigerian students aged fourteen to sixteen sitting WASSCE (set by WAEC) and UTME (set by JAMB). One taxonomy serves both exams, so a student's progress on a topic means the same thing whichever paper the question came from. Every past question is placed on one subtopic, and a student's mastery is tracked per subtopic, so the grain matters: too broad and a student cannot see what to work on, too narrow and there are subtopics no question ever lands on.

## Inputs, in your working directory

- `syllabus-*.txt`: the official syllabus text for each exam available. {{syllabus_note}}
- `standard.md`: the taxonomy standard. It is the bar the tree is judged against at the gate: read it before anything else.
- `reference.json`: the finished Biology taxonomy. It is the model for the shape, the grain and the quality of every field. Read it fully before starting, including `why`, `source`, `how_to_use` and `legacy_note`.
- `legacy-topics.json`: the {{subject}} topic names already in the live database. Every one must be folded into your taxonomy. Questions already sit on these topics, and they will move to wherever you fold them.
- `sample-items.json`: real questions from the most recent paper of each exam, stem and options only. Use them to check that your subtopics are where real questions land.

## How to build it

- **The syllabus is the spine.** Parent topics follow the syllabus's own numbered topics; subtopics follow its sub-areas. Where the WAEC and JAMB syllabi cover the same content, it is one subtopic that cites both. Where only one covers something, the subtopic cites only that one.
- **The grain.** Most parents hold two to six subtopics. A subtopic is one thing a student can be good or bad at. If a teacher would split it into two lessons with different skills, it is two subtopics. If no real question could tell two subtopics apart, they are one.
- **Real papers override the syllabus's stated scope.** If the sample questions test content the syllabus places outside the objective paper, include it, and say so in `source.scope_rule`.
- **Every subtopic has a `covers` line** saying in plain words what belongs there. Where two subtopics border each other, the covers line says which one a borderline question goes to.
- **Fold every legacy topic.** Map each name in `legacy-topics.json` to the subtopic it matches. Map a generic name ("General questions", a bare subject name, a name that spans several areas) to the parent topic it fits best, not to a guessed subtopic. Explain the rule in `legacy_note`.
- **Ids** are short, lowercase and hyphenated: parent `motion`, subtopic `motion.projectiles`. A subtopic id starts with its parent id and a dot.
- Names are the words a Nigerian teacher would use, in sentence case.

## Output

Write `output.json` in your working directory, the same shape as `reference.json`:

```json
{
  "subject": "{{subject}}",
  "version": "1.0",
  "status": "proposal",
  "why": "...",
  "source": {"documents": [{"exam": "WASSCE", "document": "...", "retrieved_from": "...", "retrieved_on": "..."}], "scope_rule": "..."},
  "how_to_use": "...",
  "topics": [
    {"id": "motion", "name": "Motion", "part": "...", "syllabus": {"waec": "...", "jamb": "..."},
     "subtopics": [
       {"id": "motion.projectiles", "name": "Projectiles", "syllabus": {"waec": "...", "jamb": null}, "covers": "..."}
     ]}
  ],
  "legacy_note": "...",
  "legacy_to": {"<legacy name>": "<parent or subtopic id>"}
}
```

`syllabus` gives the reference in each exam's syllabus, or null where that exam does not cover it. Source details for each syllabus are at the top of its text file. No em-dashes and no exclamation marks. Then read the file back and confirm: it parses, every id is unique, every subtopic id starts with its parent's id, every legacy name is mapped to an id that exists, and every subtopic has a covers line.

## Reply

Short: parents and subtopics (counts), how many legacy topics went to a subtopic and how many to a parent, where the two syllabi disagreed and how you resolved it, and any place you were unsure of the grain.
