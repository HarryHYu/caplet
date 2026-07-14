# Design QA — polished guided Demo

**Comparison target**

- Source visual truth: `/Users/ray/.codex/generated_images/019f5f3c-0712-79b2-a47f-450c326dd8a0/exec-8c3b68d6-d763-45df-a973-2855c0476ebd.png` (the selected warm guided-tour direction).
- Intentional source change: the concept's human guide has been replaced with Caplet's existing `/public/logo.png`, as requested by the user.
- Implementation: `http://127.0.0.1:5173/demo`
- Browser-rendered implementation screenshot: `/Users/ray/caplet/output/playwright/demo-polish-build-revealed.png`
- Viewport: 1665 × 908 CSS px. The source concept is 1487 × 1058, so it was proportionally normalized and compared by content region rather than browser chrome.
- State: Lesson step, after selecting **Show me the slide editor**.
- Full-view comparison evidence: `/Users/ray/caplet/output/playwright/demo-polish-option2-comparison.png`
- Focused comparison evidence: `/Users/ray/caplet/output/playwright/demo-polish-option2-focus-comparison.png` — needed to judge the Reading slide, open editor, focus treatment, and guide sidecar at readable scale.

**Findings**

- No actionable P0/P1/P2 findings remain.
- Acceptable, intentional differences:
  - The guide uses the real Caplet logo rather than the source concept's person.
  - The source's drawn arrow is replaced with one clear, working action and a visible blue focus state. This keeps the underlying interface usable and makes the interaction understandable without product knowledge.
  - The implemented walkthrough uses Caplet's real lesson, assignment, student-help, and support screens rather than a static mock, so content and exact card proportions vary by scene.

**Required fidelity surfaces**

- Fonts and typography: The existing Bricolage display hierarchy, Hanken body copy, handwritten accent, and compact labels produce a readable entry screen and scannable guide. No clipping, overlap, or unreadable wrapping was observed at the tested desktop size.
- Spacing and layout rhythm: The cream canvas, calm page margins, centred work area, lower-right guide, generous form spacing, and blue focus ring preserve the selected direction's low-density rhythm. The assignment form deliberately takes visual priority once opened.
- Colors and visual tokens: Existing `surface-*`, `text-*`, `line-*`, and `accent-*` tokens retain the warm paper, navy call-to-action, and blue focus treatment. No raw component color values were introduced.
- Image quality and asset fidelity: Caplet's existing logo is shown with `object-contain` in a padded mark holder; no human portrait, handcrafted SVG, placeholder, or code-drawn substitute is used.
- Copy and content: Product terms are translated into everyday outcomes: **Lesson**, **Class**, **Student**, and **Support**. Each scene says what will happen, opens the real example, and then explains it in plain language.

**Interaction and implementation checks**

- Tested in the browser: overview launch; Lesson guide opens the Reading editor; Class guide opens the real New Assignment dialog; Student guide opens the AI helper; Support guide opens the suggested adaptive assignment with the learning goal and relevant students filled in; header navigation, menu navigation, previous/next, finish, and restart.
- Browser console: final run reported 0 errors and 0 warnings.
- Accessibility: labelled step navigation and guide region, descriptive logo alt text, keyboard-focusable controls, a polite result status for the assignment dialog, and reduced-motion handling for the focus treatment are present. `src/test/demo.test.jsx` includes an Axe-backed overview check.

**Comparison history**

1. Initial redesign comparison found a P2 mismatch: the Lesson guide framed the Section card rather than the editable Reading slide.
   - Fix: `findDemoFocusTarget('build')` now opens and frames the Reading card.
   - Post-fix evidence: `/Users/ray/caplet/output/playwright/demo-polish-build-revealed.png` and `/Users/ray/caplet/output/playwright/demo-polish-option2-focus-comparison.png`.
2. Polish comparison found a P2 hierarchy issue: the Class guide remained visible above the New Assignment dialog, competing with the form.
   - Fix: after the guide opens the dialog it now yields visible space to the real form while preserving the result as a screen-reader status.
   - Post-fix evidence: `/Users/ray/caplet/output/playwright/demo-polish-teach-revealed.png`.
3. Final comparison found no actionable P0/P1/P2 differences. The remaining visual differences are intentional and documented above.

**Implementation checklist**

- [x] Replace internal jargon with plain, outcome-led language.
- [x] Make every guide action reveal the real product interface.
- [x] Use the Caplet logo as the guide identity.
- [x] Prevent the guide from competing with the assignment form.
- [x] Verify all four scenes, console output, automated tests, production build, and visual comparisons.

**Follow-up polish**

- [P3] If the product later adds per-scene contextual anchors, the post-action guide could tuck into a nearby unused edge rather than the fixed lower-right position on every screen.

final result: passed
