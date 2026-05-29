/**
 * MathText — renders a plain string that may contain LaTeX math delimiters.
 *
 * Supported syntax (mirrors what the AI is instructed to output):
 *   Inline:  $x^2 + y^2 = r^2$
 *   Block:   $$\frac{a}{b}$$
 *
 * Uses KaTeX to render math fragments; plain text is output as-is.
 * KaTeX output is inherently safe HTML (no script injection possible).
 */
import katex from 'katex';

// Splits a string into alternating text / math tokens.
// Returns [{ type:'text'|'math', content, display }]
function tokenise(str) {
  const tokens = [];
  // Match $$…$$ first (display), then $…$ (inline).
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', content: str.slice(last, m.index) });
    const display = m[1] !== undefined;
    tokens.push({ type: 'math', content: m[1] ?? m[2], display });
    last = m.index + m[0].length;
  }
  if (last < str.length) tokens.push({ type: 'text', content: str.slice(last) });
  return tokens;
}

function renderMath(tex, display) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
  } catch {
    return tex;
  }
}

export default function MathText({ children, className }) {
  if (children == null) return null;
  const text = String(children);

  // Fast path — no $ at all, just render the string.
  if (!text.includes('$')) return <span className={className}>{text}</span>;

  const tokens = tokenise(text);

  return (
    <span className={className}>
      {tokens.map((tok, i) =>
        tok.type === 'math' ? (
          <span
            key={i}
            // KaTeX generates safe HTML — no user input reaches innerHTML.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderMath(tok.content, tok.display) }}
          />
        ) : (
          <span key={i}>{tok.content}</span>
        ),
      )}
    </span>
  );
}
