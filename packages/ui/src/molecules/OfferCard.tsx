import { cx } from '../foundations/cx.ts'
import { Button } from '../atoms/Button.tsx'
import { Icon } from '../foundations/Icon.tsx'

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

/**
 * One product of the sponsorship page: who it is for, what it includes and what it costs. Side by
 * side, the prices line up at the foot of the cards whatever each one includes.
 */
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
      className={cx('flex flex-col gap-4 p-6 rounded-sm border border-subtle bg-raised', className)}
    >
      <p className="m-0 font-mono text-label uppercase text-accent">{audience}</p>
      <h2 id={headingId} className="m-0 font-display text-title uppercase">
        {title}
      </h2>
      <p className="m-0 text-body text-secondary">{description}</p>
      <div className="grid content-start gap-2 flex-1">
        <h3 className="m-0 font-mono text-label-s uppercase text-secondary">{includesLabel}</h3>
        <ul className="m-0 p-0 list-none grid gap-2 text-body">
          {includes.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Icon name="check" size="md" className="text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-display-l text-primary">{price}</span>
        {listPrice ? <s className="text-body text-secondary">{listPrice}</s> : null}
        {priceNote ? (
          <span className="basis-full font-mono text-label uppercase text-secondary">
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
