'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Code blocks
        pre({ children, ...props }) {
          return (
            <div className="relative group my-4">
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm" {...props}>
                {children}
              </pre>
            </div>
          );
        },
        // Inline code
        code({ className, children, ...props }) {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-purple-600 dark:text-purple-400" {...props}>
                {children}
              </code>
            );
          }
          return <code className={className} {...props}>{children}</code>;
        },
        // Headings
        h1({ children }) {
          return <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h3>;
        },
        // Paragraphs
        p({ children }) {
          return <p className="mb-3 leading-relaxed">{children}</p>;
        },
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-4 space-y-1 ml-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-4 space-y-1 ml-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              {children}
            </a>
          );
        },
        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-purple-50 dark:bg-purple-900/20 rounded-r-lg">
              {children}
            </blockquote>
          );
        },
        // Tables
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
              {children}
            </td>
          );
        },
        // Horizontal rule
        hr() {
          return <hr className="my-6 border-gray-300 dark:border-gray-700" />;
        },
        // Strong/Bold
        strong({ children }) {
          return <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>;
        },
        // Emphasis/Italic
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
