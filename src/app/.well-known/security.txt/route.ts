import { resolveBaseUrl } from '@/lib/site-url'

/**
 * RFC 9116 security.txt.
 *
 * A researcher who finds something needs to know where to send it. Without
 * this file the realistic outcomes are a public tweet or a dropped report;
 * with it, the first move is a private mail to a monitored address.
 *
 * `Expires` is mandatory — a stale file is worse than none, because it tells
 * researchers the programme is abandoned. Regenerate annually.
 */
export const dynamic = 'force-static'
export const revalidate = 86400

export function GET() {
  const base = resolveBaseUrl()
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const body = [
    'Contact: mailto:security@nexora.ir',
    'Contact: mailto:support@nexora.ir',
    `Expires: ${expires}`,
    'Preferred-Languages: fa, en',
    `Canonical: ${base}/.well-known/security.txt`,
    `Policy: ${base}/security`,
    'Acknowledgments: https://nexora.ir/security',
  ].join('\n')

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
