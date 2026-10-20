"""
The question bank: every paper, passage and question in one SQLite file that can
be opened, joined and queried, rebuilt from the pipeline's own outputs.

    python -m bank                 build out/bank/sabiprep-bank.sqlite, check it,
                                   compare it with the last build, report
    python -m bank --query "SQL"   one query against the last build
    python -m bank --report        the last build's checks again, without building

Nothing is decided here. A question's text comes from the extractor, its key
from the settled answers, its hints, solution and subtopic from the export, its
status from the sort. A new paper, a new year or a new subject reaches the bank
the same way: its source file and a config under configs/, the pipeline run
(run.py), then a build. Nothing enters the bank by another door, so every
question carries the same shape and has passed the same checks.

Every question has one key, built from what is printed on the paper, so it
reads the same in a file name, a URL, a report and a correction:

    wassce-mathematics-2024-p1-q08           WASSCE Mathematics 2024, paper 1, question 8
    wassce-english-language-2023-p3-q12      the 2023 Test of Orals, question 12

Paper 1 is the objective paper, paper 3 WAEC English's Test of Orals, paper 2 a
second paper under one year header whose year is still to be confirmed.

To change a question, change its source (corrections/<slug>.json, or the paper
itself) and rebuild. The bank is a build product: an edit made in the file is
overwritten by the next build, so it never drifts from what the pipeline checked.

The parts, one job each:
    collect.py    pipeline outputs -> paper and question records (reads only)
    contract.py   what a record must be, and the checks each question is held to
    store.py      the tables and views, written whole and swapped in
    evals.py      the checks across the bank, the build against the last one,
                  and the findings: which check fails, how often, where the fix goes

How it improves: every build keeps its report (out/bank/reports/). A check that
starts failing, or fails more than last time, becomes a finding that names the
place its fix belongs: the extractor, the teaching standard and its stages, a
correction, or a taxonomy. A person approves that fix there; the bank never
patches a question itself. A new check is one function in contract.py.
"""
