import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMarkdownMath } from '../../lib/markdownMath';

/**
 * Renders thread/post body markdown — LaTeX math ($...$, $$...$$, and the
 * \(...\)/\[...\] forms), fenced code blocks, and standard markdown —
 * reusing the app's existing MathText/lesson-content pipeline and the
 * .prose-lesson styling already defined for lesson reading.
 */
export default function ForumContent({ children, className = '' }) {
  if (children == null) return null;
  return (
    <div className={`prose-lesson break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMarkdownMath(String(children))}
      </ReactMarkdown>
    </div>
  );
}
