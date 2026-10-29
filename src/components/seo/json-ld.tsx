/**
 * Renders JSON-LD into the document.
 *
 * Deliberately a server component with no client JS — structured data is only
 * ever read by crawlers, so shipping it to the browser costs nothing extra.
 *
 * The `</script>` guard matters: post titles and excerpts are author-supplied
 * and could otherwise close the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data) return null

  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped above; this is the standard pattern
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}

export function JsonLdGraph({ items }: { items: (Record<string, unknown> | null | undefined)[] }) {
  const graph = items.filter(Boolean) as Record<string, unknown>[]
  if (!graph.length) return null
  return <JsonLd data={{ '@context': 'https://schema.org', '@graph': graph }} />
}
