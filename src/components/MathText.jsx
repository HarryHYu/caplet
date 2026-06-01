/**
 * MathText — renders a string that may contain markdown and/or LaTeX math.
 *
 * Supports:
 *   Markdown:  **bold**, *italic*, `code`, etc.
 *   Inline math:  $x^2 + y^2 = r^2$
 *   Block math:   $$\frac{a}{b}$$
 *
 * Used for all non-prose slide fields (questions, options, card fronts/backs,
 * match pairs, etc.) that come from AI-generated content.
 */
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function MathText({ children, className }) {
  if (children == null) return null;
  const text = String(children);

  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // MathText is used inline — avoid block-level <p> wrappers.
          // Use span.block so multiple paragraphs still stack visually.
          p: ({ children: c }) => <span className="block">{c}</span>,
        }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}
