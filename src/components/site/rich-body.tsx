'use client'

import sanitizeHtml from 'sanitize-html'

/**
 * Allowlist HTML sanitiser for admin-authored rich text.
 * Only platform admins can write this content, but rendered HTML is still
 * sanitised with a strict allowlist (tags + attributes + URL schemes) —
 * regex blocklists are bypassable, allowlists are not.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'code', 'pre', 'table', 'thead',
    'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    span: ['class'],
    div: ['class'],
    p: ['class'],
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
    td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // img also allows data: URIs — but only data:image/* passes the default
  // data-tag filter of sanitize-html, never data:text/html.
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    // external links never pass page context or referrer
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
  },
}

export function RichBody({ content, className = '' }: { content: string; className?: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content)

  if (looksLikeHtml) {
    return (
      <div
        className={`prose-editorial ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content, SANITIZE_OPTIONS) }}
      />
    )
  }

  return <div className={`prose-editorial whitespace-pre-wrap ${className}`}>{content}</div>
}
