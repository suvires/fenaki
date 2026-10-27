import type { ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export interface ProseProps {
  /** Rendered Markdown, such as a legal page. */
  children: ReactNode
  className?: string
}

/**
 * Long-form text from Markdown: headings, paragraphs, lists, tables and links in the system's
 * type scale. Wide tables scroll on their own so the page never scrolls sideways.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cx(
        'grid gap-4 max-w-prose min-w-0 text-body text-primary',
        '[&_h1]:m-0 [&_h1]:font-display [&_h1]:text-display-l [&_h1]:uppercase [&_h1]:text-balance',
        '[&_h2]:m-0 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-title [&_h2]:uppercase',
        '[&_h3]:m-0 [&_h3]:mt-2 [&_h3]:text-card-title',
        '[&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:mt-1',
        // Bullets and numbers in the action color, like the links, so lists read as lists.
        '[&_ul]:list-disc [&_ol]:list-decimal [&_li]:marker:text-accent',
        '[&_strong]:font-[number:var(--text-meta-strong--font-weight)]',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:no-underline [&_a]:rounded-xs [&_a:focus-visible]:focus-ring',
        '[&_code]:font-mono [&_code]:text-small',
        '[&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-small',
        '[&_th]:text-left [&_th]:align-top [&_th]:p-2 [&_th]:border-b [&_th]:border-strong',
        '[&_td]:align-top [&_td]:p-2 [&_td]:border-b [&_td]:border-subtle [&_td]:text-secondary',
        '[&_blockquote]:m-0 [&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-strong [&_blockquote]:text-secondary',
        className,
      )}
    >
      {children}
    </div>
  )
}
