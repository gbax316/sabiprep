You are splitting long sentences in the hints and solutions of {{count}} real {{exam}} {{subject}} questions ({{unit}} paper). The teaching is already written and reviewed. Your only job is to make the listed sentences shorter.

## Read these first, in your working directory

1. `long.json`: for each question, the fields that hold a sentence over {{limit}} words, the field's full text, and the long sentences in it, quoted exactly.
2. `teaching.md`: the standard. Read "Short sentences, everyday words".

## What to do

For each listed sentence, break it into two or three shorter sentences, each under {{limit}} words and most under 20, one idea to a sentence. Do it by putting a full stop where one idea ends and the next begins.

- You may drop the word that joined two ideas ("and", "which", "so", "while", "because").
- You may start the new sentence with a short word that carries the meaning on ("This", "It", "They", "So", "These").
- A list of four or more things may move onto its own line after a colon.

Change nothing else. Every other word stays exactly as it is, in the same order, in the same field: no new facts, no dropped words such as "not" or "usually", no rewording, no new or removed numbers, units or option letters. Sentences that are not listed are not touched. A machine compares your words with the original and refuses any field where a word was added or removed beyond the joining and opening words above.

Keep the solution's layout exactly: the "Answer:" line, the blank lines, "How to tell:", "Why not the others:", one line per option, "Exam tip:". Plain text only: no markdown, no em-dashes, no exclamation marks.

## Output

Write `output.json`: {"items": [{"q_number": <n>, "<field>": "<the field's full new text>", ...}]}, one entry per question in `long.json`, carrying only the fields listed for it, each as its complete text with the long sentences split.
