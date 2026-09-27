# Marco's Math Workshop

The published site now has **six subsites with four parts each**: redo, similar A, similar B, and a timed challenge. See [WORKSHOP.md](WORKSHOP.md) for current content, corrections, saving behavior, and tests.

The following describes the historical three-round implementation, which is no longer loaded by the site.

A text-native, adaptive review site built from Marco's verified Middle Level ISEE math miss list:

- 57 Quantitative Reasoning skills
- 66 Mathematics Achievement skills
- 6 sessions: 20 questions in Sessions 1–5, and 23 in Session 6
- immediate explanations for wrong answers
- up to 3 rounds per session
- fresh numbers and reshuffled answer positions in retry rounds
- browser-based progress saving with no account required

The public question bank contains original, parameterized practice questions. It does not publish test-booklet screenshots.

## Local preview

Serve the repository as a static site, for example:

```powershell
python -m http.server 8765
```

Then open `http://localhost:8765`.

## Validation

```powershell
node tests/validate.mjs
node tests/regroup-progress.mjs
node tests/browser-smoke.mjs
```

The validation checks all 123 source mappings, the six-session split (20, 20, 20, 20, 20, 23), and migration of saved progress from the previous seven-session layout. The original question-content issues documented in the audit remain separate from this grouping update.
