# Caplet system-wide minimal redesign — design QA

## Source and implementation evidence

- Visual source of truth: `/Users/ray/.codex/generated_images/019fdbe5-9f01-7861-b5d1-365f490b752d/exec-f40df3ce-041d-4846-9e2b-2b2047f8ca66.png`
- Source pixels: 1487 × 1058
- Exact dashboard implementation: `output/design-qa/dashboard-desktop.png` at 1487 × 1058 CSS px, device scale 1
- Current system views:
  - `output/design-qa/system/home-desktop.png` at 1440 × 1000 CSS px
  - `output/design-qa/system/home-mobile.png` at 390 × 844 CSS px
  - `output/design-qa/system/practice-desktop.png` at 1440 × 1000 CSS px
  - `output/design-qa/system/study-plan-desktop.png` at 1440 × 1000 CSS px
- Combined comparison input: `output/design-qa/system/system-comparison.png`
- State: light theme; authenticated desktop study routes where required; signed-out public/auth routes; live local API data

## Full-view comparison

The combined comparison places the approved dashboard reference beside the new public homepage, Practice, and Study Plan. Across route families the implementation now carries the same visible system: white canvas, Bricolage/Hanken type hierarchy, thin grey dividers, restrained blue accent, small circular icon surfaces, flat controls, short headings, and one dominant action. The system views intentionally retain their own information architecture rather than copying the dashboard columns onto unrelated tasks.

## Focused region checks

- **Navigation:** The approved real logo, `Caplet` wordmark, short route labels, flat active state, collapsible rail, and resize handle remain consistent. Public mobile navigation uses the compact logo/menu form.
- **Headings and copy:** Public, learning, planning, money, classes, settings, About, and Contact use the reduced page-title scale and shorter descriptions. Decorative handwriting is normalised to a small structural kicker. Practice and Study Plan removed the largest explanatory blocks and visible placeholder labels.
- **Cards and controls:** Shared learning cards, tool cards, forms, buttons, modal surfaces, legacy rounded panels, gradients, and shadows are normalised through the `caplet-minimal` shell. Focus workspaces retain task-specific controls but not ornamental lift.
- **Forms:** Settings, authentication, calculator, and study-plan fields use one flat input treatment. The Google sign-in control was reduced from a fixed 384 px to 320 px so the 390 px viewport no longer overflows.
- **Assets and icons:** The real `/logo.png` remains the brand asset. New UI icons use Heroicons. No new CSS-drawn or handcrafted SVG imagery was introduced.

## Route and behavior coverage

- Authenticated desktop route checks at 1440 × 1000: Dashboard, Library, Practice, Study Plan, Money, Financial Tools, Settings, Classes, Courses, About, Contact, Trust, Terms, and Mastery.
- Mobile checks at 390 × 844: Home, Login, Register, Library, Money, Financial Tools, Classes, Courses, About, Contact, Trust, and Terms. The prior dashboard mobile capture remains at `output/design-qa/dashboard-mobile.png`.
- No checked page had document-width overflow after the Google sign-in width correction.
- Primary navigation, dashboard collapse/resize, Practice mode selection, Study Plan step controls, settings tabs, public calls to action, and tool/library links remained interactive.
- Semantic landmark checks found one main region on the checked route families after correcting Money and About ownership.

## Required fidelity surfaces

- **Fonts and typography:** Passed. Bricolage Grotesque remains the display face and Hanken Grotesk remains the body face. Page headings are capped at the approved visual scale; labels and long titles wrap without clipping.
- **Spacing and layout rhythm:** Passed. Containers share a 1220 px maximum frame, desktop sections use generous whitespace and dividers, and mobile sections collapse into a readable single column.
- **Colors and tokens:** Passed. The default light surface is white with neutral grey lines and one blue accent. Dark and user palette support remain token-driven.
- **Image quality and asset fidelity:** Passed. The supplied logo is sharp and consistently contained; the reference does not require additional raster imagery.
- **Copy and content:** Passed. Core route headings and descriptions were shortened while required trust, financial, assessment, and learning-state information remains available.

## Findings and comparison history

1. **P1 · system inconsistency:** The initial cross-route review showed large decorative headings, handwritten labels, shadows, gradients, oversized rounded cards, and dense descriptions outside Dashboard. Fixed with the shared `caplet-minimal` shell, revised tokens/primitives, and targeted rewrites of the highest-noise pages. The combined comparison now shows one consistent design language.
2. **P2 · Practice hierarchy:** The recommendation dominated the page as a large solid-blue panel. Rebuilt it as a concise divided row and reduced the mode cards. The current Practice capture restores the action-first hierarchy.
3. **P2 · Study Plan noise:** Thirty-nine visible `Placeholder` labels and a large centred introduction increased cognitive load. Removed visible placeholder badges, retained availability context in accessible labels, shortened the introduction, and flattened the form surface.
4. **P2 · mobile auth overflow:** The Google sign-in control extended 26 px beyond the 390 px viewport. Reduced and centred the control; Login and Register now fit their viewport.
5. **P3 · development environment warning:** The browser reported local auto-login rate-limit warnings and repeated Google Identity initialisation warnings after repeated route cycling. These did not create rendering errors and are outside the visual change set.

## Automated verification

- `npm run lint` — passed
- `npm test` — passed, 43 files and 199 tests
- `npm run build` — passed
- `git diff --check` — passed

## Browser comment iteration — 7 August 2026

- Source truth: the five attached browser-comment screenshots at 1406 × 1024 or their captured page height, plus the approved dashboard source above.
- Rendered evidence:
  - `output/design-qa/comments-aug7/dashboard-viewport.jpg` — 1406 × 1024 CSS px, device scale 1, authenticated dark theme.
  - `output/design-qa/comments-aug7/dashboard-source-comparison.jpg` — approved dashboard and revised Dashboard combined in one comparison input.
  - `output/design-qa/comments-aug7/practice-sentence-case.jpg` — 1406 × 1024 CSS px, authenticated dark theme.
  - `output/design-qa/comments-aug7/assessments-note-removed.png` — 1402 × 3393 full-page evidence, authenticated dark theme.
- Focused evidence: DOM and computed-style checks confirmed the exact six Library selections appear on Dashboard, `Learn by doing` and `Ready to resume` render with `text-transform: none`, the assessment planning note and source links are absent, and a resource shortcut can be added and removed from the sidebar.
- Primary interactions: subject deselection was reflected on Dashboard immediately and then restored; resource pinning was exercised in the browser through the keyboard-accessible bookmark control, while native drop handling was covered by the interaction test.
- Console: a fresh browser tab produced no current errors. One older Vite hot-reload error remained in the reused tab history and was not reproducible.

### Required fidelity surfaces for this iteration

- **Fonts and typography:** Passed. Practice eyebrow labels and mode metadata now use sentence case with normal letter spacing; the existing Bricolage/Hanken hierarchy remains intact.
- **Spacing and layout rhythm:** Passed. The exact selected subjects fit the left column without duplicate shorthand labels; pinned shortcuts form a compact secondary navigation group.
- **Colors and tokens:** Passed. Drop, pinned, hover and active states reuse the existing accent and neutral tokens in both themes.
- **Image quality and assets:** Passed. The existing Caplet logo and Heroicons remain unchanged; no new raster or improvised assets were introduced.
- **Copy and content:** Passed. The unwanted assessment explainer is removed, resource pinning has one concise instruction, and shortcut labels remain understandable at narrow sidebar widths.

### Comparison history

1. **P1 · subject selection drift:** Dashboard injected Economics and fallback subjects, limited the list to three, and shortened both Mathematics courses to the same label. It now reads the shared persisted selection and renders every exact subject name. Live remove-and-restore verification passed.
2. **P1 · resource shortcuts were not customisable:** Dashboard tools are now draggable to the sidebar, also expose an accessible bookmark action, persist locally, show a drop target, and can be removed. Drag/drop and removal tests passed.
3. **P2 · forced uppercase practice labels:** The shared minimal shell no longer forces uppercase or expanded letter spacing. Computed-style and visual checks passed.
4. **P2 · assessment source explainer remained visible:** The full planning note, buttons and source footer were removed. Full-page and DOM checks confirm absence.
5. **P3 · long pinned label at a user-narrowed sidebar width:** The pinned `Resource library` item uses the concise visible label `Library` while retaining its full accessible name and tooltip.

## Exam countdown and assessment customisation iteration

- Dashboard evidence: the next Yearly exam appears in the existing `This week` column as `English Advanced exam`, `24 days · Mon, 31 Aug`, linking directly to `/assessments`.
- Assessment-page evidence: the page shows a dedicated next-exam countdown, editable timeline controls, a desktop editor dialog, and a 390 × 844 responsive editor with no horizontal overflow.
- Interaction coverage: add, edit, remove, official-task personalisation, official-task hiding, persistence, and personalised countdown priority all pass automated tests.
- Data boundary: workbook-derived defaults remain in an immutable source module. Browser-local overrides are labelled `Personalised`; hiding a default does not alter the source schedule.
- Console: a fresh authenticated browser tab produced no errors. The reused development tab retained one stale Footer hot-reload message that was not reproduced.
- **Typography, spacing, colors, assets, and copy:** Passed. The feature reuses the established type, divider, icon, form, and accent system; both countdown surfaces remain concise and the editor fits desktop and mobile without clipping.

final result: passed
