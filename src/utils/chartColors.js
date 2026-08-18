// Canonical data-series palette for every chart in the app.
//
// Data-series colors are the one deliberate exemption from the design-token
// rule: chart series need fixed, distinguishable hues that read the same in
// light and dark mode, so they stay as hex. Define them ONCE here — do not
// re-declare local CHART_COLORS/EXPR_COLORS lists in components.
//
// Consumers:
//   - src/components/lesson/SlideRenderer.jsx (lesson chart slides)
//   - src/components/editor/SlideForms.jsx    (Desmos expression colors)
//   - src/pages/forum/blocks/ForumChartBlock.jsx (forum charts; swaps the
//     first entries for forum tokens but pulls its extras from here)
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

/** Cycle through the palette for the i-th data series. */
export function chartColor(i) {
  return CHART_COLORS[i % CHART_COLORS.length];
}
