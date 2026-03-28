'use client'

import ReactMarkdown from 'react-markdown'

interface AiContentRendererProps {
  content: string
}

export function AiContentRenderer({ content }: AiContentRendererProps) {
  return (
    <div className="ai-content space-y-3">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-6 mb-3 pb-2 border-b border-gray-700/50 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white mt-4 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-gray-200 mt-3 mb-2">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 mb-4 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-4 ml-4 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
              <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="text-white font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-400 italic">
              {children}
            </em>
          ),
          code: ({ children }) => (
            <code className="text-purple-300 bg-gray-900/50 px-1.5 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500/30 pl-4 py-2 italic text-gray-400 my-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
