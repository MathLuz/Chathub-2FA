import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Estilos de cada elemento markdown (sem plugin de typography, só Tailwind).
const components: Components = {
  h1: ({ children }) => <h1 className="text-xl md:text-2xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg md:text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base md:text-lg font-semibold mt-3 mb-1.5 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="font-semibold mt-3 mb-1 first:mt-0">{children}</h4>,
  h5: ({ children }) => <h5 className="font-semibold mt-2 mb-1 first:mt-0">{children}</h5>,
  h6: ({ children }) => <h6 className="font-semibold mt-2 mb-1 first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-700 dark:text-cyan-400 underline underline-offset-2 hover:text-purple-600 dark:hover:text-purple-400 break-all"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-purple-500/60 pl-3 my-2 italic text-zinc-700 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-400/50 dark:border-zinc-500/50" />,
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-md bg-zinc-900 text-zinc-100 dark:bg-zinc-950 overflow-x-auto text-xs md:text-sm">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    // Blocos (```) vêm com "language-x" ou com quebra de linha; o resto é código inline.
    const isBlock = /language-/.test(className ?? '') || String(children).includes('\n');
    if (isBlock) return <code className={`font-mono ${className ?? ''}`}>{children}</code>;
    return (
      <code className="font-mono text-[0.9em] px-1 py-0.5 rounded bg-zinc-300 dark:bg-zinc-800 text-pink-700 dark:text-pink-300">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-300/60 dark:bg-zinc-800/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-zinc-400/60 dark:border-zinc-600 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-zinc-400/60 dark:border-zinc-600 px-2 py-1 align-top">{children}</td>,
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="break-words text-sm md:text-base">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
