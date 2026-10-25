import { cx } from '../cx.ts'
import { Button } from './Button.tsx'

export interface OfferCardProps {
  /** Anchor for links to this offer. */
  id?: string
  /** «Para festivales y escuelas de cine». */
  audience: string
  title: string
  description: string
  /** What the offer includes, one item per line. */
  includes: string[]
  includesLabel: string
  /** The list price, struck through when there is a founder price. */
  listPrice?: string
  price: string
  /** «Precio de fundador · tres plazas». */
  priceNote?: string
  /** A contact link, when there is a mailbox. Data, not an element: Astro pages render this card. */
  action?: { href: string; label: string }
  className?: string
}

/** One product of the sponsorship page: who it is for, what it includes and what it costs. */
export function OfferCard({
  id,
  audience,
  title,
  description,
  includes,
  includesLabel,
  listPrice,
  price,
  priceNote,
  action,
  className,
}: OfferCardProps) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <article
      id={id}
      aria-labelledby={headingId}
      className={cx(
        'grid content-start gap-4 p-6 rounded-sm border border-line bg-sala-1',
        className,
      )}
    >
      <p className="m-0 font-mono text-label uppercase text-tungsteno-text">{audience}</p>
      <h2 id={headingId} className="m-0 font-display text-title uppercase">
        {title}
      </h2>
      <p className="m-0 text-body text-ink-muted">{description}</p>
      <div className="grid gap-2">
        <h3 className="m-0 font-mono text-label-s uppercase text-ink-muted">{includesLabel}</h3>
        <ul className="m-0 pl-4 grid gap-1 text-body">
          {includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-display-l text-ink">{price}</span>
        {listPrice ? <s className="text-body text-ink-muted">{listPrice}</s> : null}
        {priceNote ? (
          <span className="basis-full font-mono text-label uppercase text-ink-muted">
            {priceNote}
          </span>
        ) : null}
      </p>
      {action ? (
        <div>
          <Button variant="secondary" href={action.href}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
