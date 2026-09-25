# Teaching standard: hints and solutions

The bar that every hint and solution must clear, for every subject. W3 writes to
it. R2 reviews against it. When a resent subject runs through the pipeline, this
file is what keeps it matching Biology.

The reader is a Nigerian student of fourteen to sixteen, preparing for WASSCE or
JAMB, working on a tablet, often on the question they just got wrong.

## Rendering constraint

The app shows solutions as **plain text with line breaks preserved**
(`app/(learning)/practice/[sessionId]/page.tsx:1067`, `whitespace-pre-line`).
There is no markdown renderer.

- No `**bold**`, no `#` headings, no backticks. They appear to the student as
  literal symbols.
- Structure comes from line breaks and plain labels such as `Answer:` and
  `Why not the others:`.
- Use Unicode for notation: × ÷ ± ≤ ≥ ≠ ≈ √ π ° ² ³ ½ ¼ → ↔ Δ μ Ω. Write
  `H₂O`, `CO₂`, `x²`, `3 × 10⁸ m/s`. Never `x^2` or `H2O`.

## The three hints

Hints are progressive. Each one moves the student closer, and none of them hands
over the answer. A student who reads all three must still make the choice.

| Hint | Job | Must not |
|---|---|---|
| **1** | Orient attention: which concept, which feature, where to look first | Name the answer, or rule out options by name |
| **2** | Give the decisive principle, or eliminate the weakest distractors | State the answer, even indirectly |
| **3** | Bring the student to the final step, usually by narrowing to two | Make the choice for them |

The test for hint 3: if a student can answer by reading hint 3 alone, without
thinking, it is too strong.

The test for hint 1: if it would help a student on a *different* question in the
same topic, it is pitched right.

## The solution

Plain text, in this order, every time:

```
Answer: <letter>. <option text>

<The principle, one or two sentences. Why this is true, not just that it is.>

How to tell: <the decisive evidence or the working, step by step if needed>

Why not the others:
<letter>. <option>: <one clause saying why it fails>
<letter>. <option>: <one clause saying why it fails>
<letter>. <option>: <one clause saying why it fails>

Exam tip: <a transferable cue for this kind of question>
```

**The principle comes before the working.** A student who understands why can
answer the next question on the topic. One who only saw the working cannot.

**Why not the others is not optional.** It is the elimination technique, and
eliminating wrong answers is how most multiple-choice questions are actually
won under time pressure. Every distractor gets one line.

**The exam tip must transfer.** "Remember the answer is D" is not a tip. "For
nymph questions, check the hind legs first" is.

**Show working for anything calculated.** Each step on its own line, units
carried through, the final value stated with its unit.

## Syllabus answers without false claims

Past papers are built on the syllabus's simplifications. "Villi are for absorption,"
"the colon absorbs water," "at carrying capacity the population is constant." The key
follows the examiner, so the teaching must too. But a solution must never state a
simplification as if it were universally true, because the student carries that belief
into the next exam and into life.

- **Teach the examiner's answer.** Never argue the student out of the key.
- **Scope what the syllabus simplifies.** "In the syllabus, strength comes from the cell
  wall." "In Biology, conservation means the careful use of natural resources." "The
  population is taken as constant."
- **Avoid absolutes unless they are literally true.** *Nothing*, *only*, *never*,
  *always*, *has no role* are almost always false somewhere. The vacuole does play a part
  in some plant movements; energy and buildings are conserved too.
- **Do not contradict yourself.** Saying a population wobbles and then that it stays the
  same is a contradiction. Say it is taken as constant, or stays roughly the same.
- **Stay at syllabus depth.** Scoping a claim is not an invitation to teach university
  physiology. One short qualifier, then move on.

Found on Biology 2025, where five of seven hard items stated a syllabus simplification as
fact: Q6, Q24, Q25, Q31 and Q39.

## Shared stems and sibling questions

Where one stem, diagram or passage serves several questions, those questions are
siblings. In practice mode a student works them in order and reads hints before
answering.

- **A hint must not give away a sibling's answer.** On 2025 Q29, "identify the
  instrument", the hint said the disc was "pushed down into water", which is the answer to
  Q30, "what does it measure". Describe what identifies this question's answer and nothing
  that answers the next one.
- A solution may name facts a sibling depends on, because it is read after answering and
  cannot explain the answer otherwise. Hints are read before, so they carry the rule.
- This matters most for English comprehension, where one passage can carry eight
  questions and an early hint can answer a late one.

## Topic and difficulty

Every question sits on one subtopic: `subtopic_id`, an id from the subject's
`taxonomies/<subject>.json`. A separate classifier places it before teaching is
written, by what a student must know to answer it rather than by words in the
stem. The author keeps that placement, and flags it with `placement_challenge`
only when it is plainly wrong. Never invent an id.

`difficulty`:

- `easy`: direct recall of a single fact
- `medium`: applying a concept, or reading a diagram
- `hard`: combining two concepts, multi-step working, or a subtle distractor

## Worked example

WASSCE Biology 2025, question 2. Shared stem: "The diagram below is an
illustration of the nymph of an insect."

> The organism illustrated is a stage in the
> A. grasshopper  B. mosquito  C. termite  D. cockroach

**Hints**

1. Look at the overall body shape and the length of the antennae before anything else.
2. Mosquitoes have no nymph stage at all, and a grasshopper nymph has hind legs much larger than its front legs.
3. Of the two insects left, which one has a flat oval body and very long antennae?

**Solution**

```
Answer: D. cockroach

A nymph is the young stage of an insect that develops by incomplete metamorphosis. It already looks like a small, wingless version of the adult, so its body plan tells you which insect it is.

How to tell: the body is flattened and oval, the antennae are very long and thread-like, and the legs are slim running legs. No pair is thickened for jumping. That is the cockroach body plan.

Why not the others:
A. grasshopper: its nymph has large, powerful hind legs for jumping. These legs are all similar.
B. mosquito: it develops by complete metamorphosis, through a larva and a pupa, so it has no nymph stage.
C. termite: its nymphs are pale and soft-bodied, with short, bead-like antennae.

Exam tip: in "identify the nymph" questions, check the hind legs first. Enlarged hind legs point to a grasshopper. Slim running legs with long antennae point to a cockroach.
```

Subtopic: `growth.metamorphosis`. Difficulty: `medium`, because it requires reading the diagram against knowledge of two developmental patterns.

## Diagram alt text

The import rejects any question image without alt text
(`import/validate/route.ts:259-268`), and a student using a screen reader
depends on it. One alt text per diagram file, shared by every question the file
serves.

**Give a blind student what a sighted student sees, and nothing more.**

- Describe shapes, positions, arrows and any printed words, in neutral spatial
  language: "the pointed top end", "a J-shaped sac below the tube", "a line
  running out to the edge".
- **Never use the answer's vocabulary.** For a "name the labelled parts"
  question, "I is at the apex" gives away the answer. "I points to the pointed
  top end of the leaf" gives the same information a sighted student has, and no
  more.
- Never name the organism, organ, instrument or process a question asks the
  student to identify.
- Printed labels on the diagram are quoted exactly, because a sighted student
  reads them too.
- Keep it to what the questions need. A labelled diagram can take three or four
  sentences. A simple one takes one.

## What R2 checks

R2 rejects an item that fails any of these, and says which:

1. Hint 1 names the answer or rules out options by name.
2. Hint 3 lets the student answer without thinking.
3. The solution restates the question instead of explaining the principle.
4. A distractor is missing from "Why not the others".
5. The exam tip does not transfer to another question.
6. Markdown syntax appears anywhere, or notation is written as `x^2` instead of `x²`.
7. The solution contradicts the verified answer.
8. A fact in the solution is wrong.
9. `subtopic_id` is not in the taxonomy, or plainly the wrong place for what the question tests.
10. Language a fifteen-year-old would stumble over, where a plainer word exists.
11. A syllabus simplification stated as universal truth, an unscoped absolute, or a
    self-contradiction. Judge it at syllabus depth: a claim correctly scoped to the
    syllabus passes, even if university biology would add detail.
12. A hint that gives away the answer to a sibling question sharing the same stem.

**When a check fails, quote the exact words that fail it.** A reviewer who paraphrases
can misread; on 2025 Q24 a reviewer reported a claim the text never made. Quoting keeps
every finding checkable.
