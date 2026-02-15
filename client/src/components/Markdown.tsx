import ReactMarkdown from "react-markdown";

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mb-3 text-white">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-bold mb-2 text-white">{children}</h4>
        ),
        p: ({ children }) => <p className="mb-3 text-white">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-bold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-white">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1 text-white">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1 text-white">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="text-white">{children}</li>,
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-white">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 text-sm font-mono text-white">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic mb-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
