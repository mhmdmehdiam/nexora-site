'use client'

import * as Accordion from '@radix-ui/react-accordion'

export interface FaqEntry {
  q: string
  a: string
}

export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  return (
    <Accordion.Root type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <Accordion.Item
          key={i}
          value={`item-${i}`}
          className="border-b border-ink-100/[0.10]"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-right transition-colors hover:text-ink-50 focus-visible:text-ink-50">
              <span className="flex items-baseline gap-4">
                <span className="font-mono text-[10px] tracking-[0.12em] text-ink-500">
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                <span className="text-[15px] font-medium text-ink-100 md:text-base">{item.q}</span>
              </span>
              <span
                aria-hidden="true"
                className="relative mt-1 flex h-4 w-4 shrink-0 items-center justify-center"
              >
                <span className="absolute h-px w-4 bg-ink-300 transition-colors group-hover:bg-sand" />
                <span className="absolute h-4 w-px bg-ink-300 transition-all duration-300 group-hover:bg-sand group-data-[state=open]:rotate-90 group-data-[state=open]:opacity-0" />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-slide-up">
            <p className="max-w-2xl pb-7 pr-9 text-[14.5px] leading-8 text-ink-400">{item.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
