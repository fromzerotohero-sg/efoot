'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renderer Markdown sicuro per la chat Hero.
 * Solo formattazione testuale (grassetto, liste, link). Nessun HTML raw.
 */
export default function ChatMarkdown({ children }) {
  const text = String(children || '').trim()
  if (!text) return null

  return (
    <div className="hc-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ children: c }) => <p className="hc-md-p">{c}</p>,
          strong: ({ children: c }) => <strong className="hc-md-strong">{c}</strong>,
          em: ({ children: c }) => <em className="hc-md-em">{c}</em>,
          ul: ({ children: c }) => <ul className="hc-md-ul">{c}</ul>,
          ol: ({ children: c }) => <ol className="hc-md-ol">{c}</ol>,
          li: ({ children: c }) => <li className="hc-md-li">{c}</li>,
          a: ({ href, children: c }) => (
            <a
              className="hc-md-a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c}
            </a>
          ),
          h1: ({ children: c }) => <p className="hc-md-heading">{c}</p>,
          h2: ({ children: c }) => <p className="hc-md-heading">{c}</p>,
          h3: ({ children: c }) => <p className="hc-md-heading">{c}</p>,
          code: ({ children: c }) => <code className="hc-md-code">{c}</code>,
          blockquote: ({ children: c }) => <blockquote className="hc-md-quote">{c}</blockquote>
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
