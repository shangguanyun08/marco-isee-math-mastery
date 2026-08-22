# Marco's ISEE Math Mastery

A text-native, adaptive review site built from Marco's verified Middle Level ISEE math miss list:

- 57 Quantitative Reasoning skills
- 66 Mathematics Achievement skills
- 7 sessions, with at most 20 questions per session
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
```

The validation checks all 123 source mappings, all 369 generated round variants, unique answer choices, changing round prompts, and the 20-question session split.
