# Design QA

## Source visual truth

- Hero: `/var/folders/fz/x56ny69x5mv574zqg28t004c0000gn/T/TemporaryItems/NSIRD_screencaptureui_TmTc1D/Screenshot 2026-08-08 at 9.20.25 AM.png` (3038 x 1776 px)
- Registration: `/var/folders/fz/x56ny69x5mv574zqg28t004c0000gn/T/TemporaryItems/NSIRD_screencaptureui_CFEHCO/Screenshot 2026-08-08 at 9.20.48 AM.png` (3032 x 1776 px)
- Subject selection: `/var/folders/fz/x56ny69x5mv574zqg28t004c0000gn/T/TemporaryItems/NSIRD_screencaptureui_gSeylM/Screenshot 2026-08-08 at 9.21.46 AM.png` (2888 x 1714 px)
- Results history: `/var/folders/fz/x56ny69x5mv574zqg28t004c0000gn/T/TemporaryItems/NSIRD_screencaptureui_63S86Q/Screenshot 2026-08-08 at 9.24.13 AM.png` (2290 x 502 px)

The source screenshots were macOS captures. Their CSS viewport and source density were not embedded, so the comparisons below normalize by rendered image height and do not make pixel-precise claims about above-the-fold crop.

## Implementation evidence

- Hero: `output/design-qa/home-implementation.png` (1276 x 718 px; 1276 x 720 CSS viewport; device pixel ratio 2; browser capture returned CSS-resolution pixels)
- Registration: `output/design-qa/register-implementation.png` (1276 x 718 px; 1276 x 720 CSS viewport; device pixel ratio 2)
- Searchable subject picker: `output/design-qa/library-search-implementation.png` (1389 x 879 px; 1389 x 881 CSS viewport; device pixel ratio 2)
- Results empty state: `output/design-qa/results-implementation.png` (1389 x 879 px; 1389 x 881 CSS viewport; device pixel ratio 2)
- Results chart section: `output/design-qa/results-charts-implementation.png` (1389 x 987 px, full-page capture)
- Combined visual comparisons: `output/design-qa/home-comparison.png`, `output/design-qa/register-comparison.png`, and `output/design-qa/results-comparison.png`

State: desktop, light theme. The guest hero and registration flow were opened on an isolated signed-out origin. Subjects and Results were tested in the authenticated Caplet shell.

## Full-view comparison evidence

- Hero: the stray standalone period is gone. The period is now attached to `on track.` and the hand-drawn underline remains anchored to that phrase. Typography, white space, header, blue accent and soft background treatment remain consistent with the source. The implementation capture is shorter than the source viewport, so the lower hero content is below the captured fold; this is a capture difference, not a missing-content finding.
- Registration: the Google control now shares the same full form-column width as the email, date and password fields. The split light/dark layout, typography, spacing and blue accent remain consistent with the supplied reference.
- Subjects: the dense faculty/category chip wall is replaced by one compact dropdown-style picker with search, selected-subject chips, check states and an explicit Done action. The main list is flat and has no faculty headings or subject subtitles.
- Results: the compact history layout and polished select controls remain consistent with the source. The implementation adds a matching year filter, report import action and a separate trends section without crowding the table.

## Focused region comparison evidence

- Registration form controls were checked at readable size in `register-comparison.png`; the Google control left/right edges align with the single-column text fields.
- The subject picker was opened, searched for `chem`, and verified to return only Chemistry while retaining selected-subject state in `library-search-implementation.png`.
- The Results dialog was opened and verified to expose Year 7 through Year 12. The report importer was opened and verified to accept PDF, DOCX and TXT, keep analysis disabled until a file is chosen, and explain the review-before-save boundary.
- Results empty-state charts were checked in `results-implementation.png`; populated bar/line rendering and persistence are covered by the frontend test fixture because the browser's date input automation could not enter a locale-formatted date without changing user data.
- Browser diagnostics were checked after the interactions: no warning or error console entries were present.

## Required fidelity surfaces

- Fonts and typography: Bricolage Grotesque display headings and Hanken Grotesk body/UI text remain in use. Heading weights, control labels and supporting-copy hierarchy are consistent; no truncation or broken wrapping was visible.
- Spacing and layout rhythm: form controls align to the same column, filters share one baseline, and the picker/trends sections retain the existing calm page rhythm. No overlap or horizontal clipping was visible at the inspected desktop widths.
- Colors and visual tokens: all additions use Caplet surface, text, accent and line tokens. Focus rings and selected states use the existing blue accent and retain contrast.
- Image quality and asset fidelity: the existing Caplet logo, hero cards and hand-drawn marks remain source assets; no visible asset was replaced with placeholder art, emoji or handcrafted SVG.
- Copy and content: wording is student-facing and concise. AI report import explicitly says what is processed and requires review before adding results.
- Interaction and accessibility: searchable listbox semantics, multiselect state, labelled selects, labelled chart regions, focus states, disabled import state and dialog dismissal were checked. Mobile behavior remains covered structurally by the existing responsive grid classes; a separate mobile browser capture was not available in the selected in-app browser.

## Comparison history

1. Earlier P1/P2 findings from the supplied screenshots: standalone hero period, narrow Google control, fragmented faculty subject wall without search, missing school-year selection, and no result visualisation/report import.
2. Fixes applied: attached hero punctuation to its phrase; made the Google iframe/control fill the form width; replaced subject categories with a searchable multiselect dropdown and flat cards; added Year 7–12 entry/filter controls; added bar and historical line charts; added reviewed AI report import.
3. Post-fix evidence: `home-comparison.png`, `register-comparison.png`, `library-search-implementation.png`, `results-implementation.png`, frontend interaction tests, and browser diagnostics.
4. Revised comparison found no remaining actionable P0, P1 or P2 mismatch in the requested areas.

## Findings

- No actionable P0, P1 or P2 findings remain in the requested desktop states.

## Follow-up polish

- P3: capture a dedicated narrow mobile viewport for the searchable picker and two-chart stack when the selected browser exposes viewport emulation.

## Implementation checklist

- [x] Hero punctuation attached to its heading
- [x] Google sign-in control aligned to form width
- [x] Searchable subject dropdown without faculty categories or subject subtitles
- [x] Year 7–12 result entry and filtering
- [x] Assessment comparison bar chart
- [x] Historical academic-growth line chart
- [x] Reviewed AI report import
- [x] Focused tests, full tests, lint, production build and browser QA

final result: passed
