import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
    ArrowUpIcon,
    BookmarkSquareIcon,
    ChatBubbleLeftRightIcon,
    CheckIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

/**
 * The essay assistant. It answers from the essay itself and the student's
 * context library first, says so when the context does not cover something,
 * and can hand back annotations the student chooses to keep — nothing is
 * written into the essay or the margin without an explicit click.
 */

const STARTERS = [
    'What is the weakest paragraph and why?',
    'Annotate each paragraph with its technique and effect.',
    'Which quotes am I under-using?',
    'How well does this answer the question?',
];

function ProposedAnnotation({ proposal, onAdd, added }) {
    return (
        <div className="rounded-xl border border-line-soft border-l-[3px] border-l-accent bg-surface-body p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                ¶{Number(proposal.paragraphIndex) + 1}{proposal.anchor ? ' · on a phrase' : ' · whole paragraph'}
            </p>
            {proposal.anchor && (
                <p className="mt-1 border-l-2 border-line-strong pl-2 font-serif text-[11px] italic leading-snug text-text-dim line-clamp-2">
                    “{proposal.anchor}”
                </p>
            )}
            <div className="prose-chat mt-1.5 !text-xs">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{proposal.note}</ReactMarkdown>
            </div>
            <button
                type="button"
                disabled={added}
                onClick={() => onAdd(proposal)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line-soft px-2.5 py-1 text-[11px] font-bold text-text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
                {added ? <><CheckIcon className="h-3 w-3" /> Added to margin</> : <><BookmarkSquareIcon className="h-3 w-3" /> Add to margin</>}
            </button>
        </div>
    );
}

function Message({ message, onAddAnnotation, addedIds }) {
    const isUser = message.role === 'user';
    return (
        <div className={isUser ? 'flex justify-end' : ''}>
            <div className={isUser
                ? 'max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-white'
                : 'max-w-full'}>
                {isUser ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                ) : (
                    /* Assistant replies are markdown (the prompt allows it) —
                       render it instead of showing raw asterisks and hashes. */
                    <div className="prose-chat">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
                {!isUser && (message.annotations || []).length > 0 && (
                    <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                            Suggested annotations
                        </p>
                        {message.annotations.map((proposal, i) => (
                            <ProposedAnnotation
                                key={i}
                                proposal={proposal}
                                onAdd={onAddAnnotation}
                                added={addedIds.has(`${message.id}:${i}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EssayChat({
    open,
    onClose,
    onSend,
    onAddAnnotation,
    contextCount,
    seed,
    onSeedConsumed,
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [addedIds, setAddedIds] = useState(new Set());
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const nextId = useRef(0);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        const el = scrollRef.current;
        if (typeof el?.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, busy]);

    // A question handed over from the document (e.g. "explain this phrase").
    useEffect(() => {
        if (!seed) return;
        setInput(seed);
        onSeedConsumed?.();
        inputRef.current?.focus();
    }, [seed, onSeedConsumed]);

    const send = async (text) => {
        const question = String(text ?? input).trim();
        if (!question || busy) return;
        setError(null);
        setInput('');
        const history = [...messages, { id: nextId.current++, role: 'user', content: question }];
        setMessages(history);
        setBusy(true);
        try {
            const res = await onSend(history.map(({ role, content }) => ({ role, content })));
            setMessages((prev) => [...prev, {
                id: nextId.current++,
                role: 'assistant',
                content: res?.reply || 'No reply came back.',
                annotations: Array.isArray(res?.annotations) ? res.annotations : [],
            }]);
        } catch (e) {
            setError(e?.message || 'The assistant could not reply.');
        } finally {
            setBusy(false);
        }
    };

    const addAnnotation = async (messageId, index, proposal) => {
        await onAddAnnotation(proposal);
        setAddedIds((prev) => new Set([...prev, `${messageId}:${index}`]));
    };

    if (!open) return null;

    return (
        <aside
            aria-label="Essay assistant"
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line-soft bg-surface-raised shadow-[-24px_0_60px_-40px_rgba(20,20,18,0.6)]"
        >
            <header className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
                <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 font-display text-sm font-extrabold tracking-tight text-text-primary">
                        <SparklesIcon className="h-4 w-4 text-accent" /> Essay assistant
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-text-dim">
                        {contextCount > 0
                            ? `Reading your essay + ${contextCount} source${contextCount === 1 ? '' : 's'}`
                            : 'Reading your essay — add sources for grounded answers'}
                    </p>
                </div>
                <button type="button" aria-label="Close assistant" onClick={onClose}
                    className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-soft hover:text-text-primary">
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                    <div>
                        <div className="rounded-2xl border border-line-soft bg-surface-body p-4">
                            <ChatBubbleLeftRightIcon className="mb-2 h-5 w-5 text-accent" />
                            <p className="text-sm font-bold text-text-primary">Ask about this essay.</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-muted">
                                Answers come from your essay and your context library first. When your sources don&apos;t cover
                                something, it says so before answering from general knowledge — and it never rewrites your words.
                            </p>
                        </div>
                        <div className="mt-3 space-y-2">
                            {STARTERS.map((s) => (
                                <button key={s} type="button" onClick={() => send(s)}
                                    className="w-full rounded-xl border border-line-soft px-3 py-2 text-left text-xs font-medium text-text-dim transition-colors hover:border-accent hover:text-accent">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m) => (
                    <Message
                        key={m.id}
                        message={m}
                        addedIds={addedIds}
                        onAddAnnotation={(proposal) => addAnnotation(m.id, (m.annotations || []).indexOf(proposal), proposal)}
                    />
                ))}

                {busy && (
                    <p className="inline-flex items-center gap-2 text-xs text-text-dim">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        Reading your essay and sources…
                    </p>
                )}
                {error && <p role="alert" className="text-xs font-medium text-rose-400">{error}</p>}
            </div>

            <div className="border-t border-line-soft p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                        }}
                        rows={2}
                        placeholder="Ask anything about this essay…"
                        aria-label="Message the assistant"
                        className="max-h-40 flex-1 resize-none rounded-xl border border-line-soft bg-surface-body px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    />
                    <button type="button" onClick={() => send()} disabled={busy || !input.trim()}
                        aria-label="Send message"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white transition-transform hover:-translate-y-0.5 disabled:opacity-40">
                        <ArrowUpIcon className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-1.5 text-[10px] text-text-dim">Enter to send · Shift+Enter for a new line</p>
            </div>
        </aside>
    );
}
