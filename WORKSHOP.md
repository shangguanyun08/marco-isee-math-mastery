# Six-session, five-part workshop

Subsites: `session-1/` through `session-6/`. Counts: **20, 20, 20, 20, 20, 23** (57 QR + 66 MA references).

Each subsite has five parts:

1. Review: methods, answers, explanations, and source notes (unscored).
2. Redo: source-based questions rebuilt as text, with explicit corrections where needed.
3. Similar A: one fresh counterpart per source item.
4. Similar B: another complete counterpart set.
5. Timed: a third new set, one minute per question; 20 minutes in Sessions 1–5, 23 minutes in Session 6.

There are 123 source-based redo questions and 369 similar questions. Review reuses the redo set. Each stage includes the whole group, not only errors from the preceding stage. Untimed practice locks the first checked answer and shows an explanation. The timed test saves selections without feedback until submission/expiry. Start sets an absolute deadline that persists through reloads and navigation. At expiry, selected answers score and blanks earn zero. Separate attempts remain in history.

## Content and corrections

The mapping in `sources.js` is unchanged. Questions were checked visually against local original-question crops and rebuilt in `question-bank.js`. No scans, student marks, selected answers, or private reports are published. Wording is streamlined, and choice order/distractors may differ. Some visual-choice questions use equivalent textual choices. Charts and relevant shapes use SVG/HTML. Conceptual variants may use alternate labels/conditions rather than arithmetic.

The source list has 119 incorrect answers and four blanks (IDs 37, 40, 19, 52: Mock2 QR37 and Mock3 QR35–37). Eight issues are explicitly noted:

- ID40 / Mock3 QR35: perimeter 60, base 30, equal sides 15 cannot form a triangle. Corrected practice uses perimeter 80.
- ID48 / Mock2 QR2: a mean four more than −2 is 2. The added number is 34, absent from the source options, not the previous key's 52.
- ID60 / Mock1 MA41: the source conversion of one gallon to 32 cups is wrong. Practice uses a 48-cup carton explicitly, retaining the intended calculation.
- ID94 / Mock3 MA41: clarify the intended alternating one-corner, two-corner movement rule.
- ID101 / Mock1 MA32: source B is (1,3), not (2,3) as stated in the earlier compilation.
- ID111 / Mock1 MA23: “half of 11 integers” is inconsistent. Corrected practice gives two middle values of ten ordered integers.
- IDs114 and 117 / Mock0 MA18, Mock1 MA6: events on different draws are not complements. Corrected exercises use one common draw.

Full source notes appear in review and after checking a redo, not before an answer. Original keys are not assumed infallible. Old `app.js`, `styles.css`, and their tests remain as historical files but are no longer loaded.

## Progress

The existing local key (`marco-isee-math-mastery-v1`) and online app ID (`marco-isee-math-mastery`) are retained. Earlier records keep their original `sessions` field; new runs use a separate `learning` field. A legacy-record panel appears on the library page when records exist. Old template scores do not count toward rebuilt questions.

The sync client reads and merges before writing, including on a new device without sync metadata. Localhost never uploads. QA blocks the shared-progress endpoint even on live-site tests. Export all records from the top bar for a portable backup.

## Build and check

```powershell
node scripts/build-workshop.mjs
node tests/workshop.mjs
node tests/browser-workshop.mjs
python -m http.server 8766
```

Tests cover 492 question structures, source answers, numeric variants, grouping, scoring, expiry, legacy preservation, merging, and first-visit sync against a mock server. Browser QA checks five parts, feedback, hidden answers, 20/23 counts, reload/navigation/expiry, notes, repeat history, and mobile overflow. Screenshots stay in ignored `tmp/workshop-qa/`.
