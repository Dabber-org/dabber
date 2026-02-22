"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface MarkdownProps {
  content: string;
  className?: string;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<{ children: string; language: string }> = ({
  children,
  language,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 
                   opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-300" />
        )}
      </button>
      {language && (
        <div className="absolute left-3 top-2 px-2 py-1 rounded text-xs font-mono 
                        bg-gray-700 text-gray-300 opacity-70">
          {language}
        </div>
      )}
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          padding: "1rem",
          paddingTop: language ? "2.5rem" : "1rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        wrapLines={true}
        wrapLongLines={true}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default function Markdown({
  content,
  className = "",
}: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-white/20 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-white border-b border-white/10 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold mb-2 mt-3 text-white">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-bold mb-2 mt-3 text-white">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-bold mb-2 mt-3 text-white/80">
              {children}
            </h6>
          ),

          // Paragraphs and text
          p: ({ children }) => (
            <p className="mb-4 text-white leading-relaxed last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white">{children}</em>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 
                         hover:decoration-blue-300 transition-colors"
            >
              {children}
            </a>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside mb-4 space-y-2 text-white pl-6">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside mb-4 space-y-2 text-white pl-6">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-white leading-relaxed">{children}</li>
          ),

          // Code
          code: ({ inline, className, children }: CodeProps) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && language) {
              return <CodeBlock language={language}>{codeString}</CodeBlock>;
            }

            return (
              <code
                className="bg-gray-800/60 px-1.5 py-0.5 rounded text-sm font-mono 
                           text-blue-300 border border-gray-700/50"
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 border-blue-500/50 pl-4 py-2 my-4 
                         bg-gray-800/30 rounded-r italic text-gray-300"
            >
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-6 border-t border-white/20" />,

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-gray-900/50">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-700">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-white border border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-white border border-gray-700">
              {children}
            </td>
          ),

          // Task lists (GFM extension)
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  className="mr-2 align-middle"
                />
              );
            }
            return <input type={type} />;
          },

          // Strikethrough (GFM extension)
          del: ({ children }) => (
            <del className="text-gray-400 line-through">{children}</del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
