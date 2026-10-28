import type { Locale } from '@fenaki/i18n'
import { ShortPreview, type BadgeTone, type Rating, type ShortPreviewProps } from '@fenaki/ui'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  createPreviewTimer,
  growFrom,
  parseTime,
  placePreview,
  type Box,
  type Placement,
  type PreviewTimer,
} from '../lib/cardPreview.ts'
import { posterTone } from '../lib/catalog.ts'
import { removeFromHistory } from '../lib/history.ts'
import { has, subscribe as subscribeList, toggle, type NewSavedShort } from '../lib/myList.ts'
import { getRating, setRating, subscribe as subscribeRatings } from '../lib/myRatings.ts'

interface CardPreviewProps {
  locale: Locale
  labels: ShortPreviewProps['labels'] & {
    /** «Dirigido por {names}» */
    directedBy: string
    /** The aspa's name on the cards of «Seguir viendo» (`removeFromHistory` on the history's). */
    removeFromContinueWatching: string
  }
}

/** What the panel shows of a short, read from its card in the page. */
interface PreviewData {
  short: NewSavedShort
  typeLabel?: string
  synopsis?: string
  badges: { label: string; tone?: BadgeTone }[]
  href: string
  /** The card is in the viewer's history: the panel offers to remove it from there. */
  removableFrom?: 'history' | 'continueWatching'
}

const HOVER = '(hover: hover) and (pointer: fine)'

function box(rect: DOMRect): Box {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

/**
 * Reads a card's data. The card carries it as `data-*` attributes (see ShortCard); the image, the
 * synopsis and the badges are already in its markup, so they are read from there.
 */
function readCard(card: HTMLElement): PreviewData | undefined {
  const { shortCard: slug, title, director, year, seconds, tone, type, imageText } = card.dataset
  const href = card.getAttribute('href')
  if (!slug || !title || !href) return undefined
  const badges = [...card.querySelectorAll<HTMLElement>('[data-card-badge]')]
    .map((badge) => ({
      label: badge.textContent?.trim() ?? '',
      tone: badge.dataset.tone as BadgeTone | undefined,
    }))
    // Branded content always comes first.
    .sort((a, b) => Number(b.tone === 'branded') - Number(a.tone === 'branded'))
  return {
    short: {
      slug,
      title,
      director,
      year: year ? Number(year) : undefined,
      seconds: Number(seconds) || 0,
      tone: posterTone(tone),
      image: card.querySelector('img')?.getAttribute('src') ?? undefined,
      imageTextColor: imageText === 'dark' || imageText === 'light' ? imageText : undefined,
      imageHasTitle: card.dataset.imageTitle !== undefined,
    },
    typeLabel: type,
    synopsis: card.querySelector('[data-card-synopsis]')?.textContent ?? undefined,
    badges,
    href,
    removableFrom:
      card.dataset.removableFrom === 'history' || card.dataset.removableFrom === 'continueWatching'
        ? card.dataset.removableFrom
        : undefined,
  }
}

interface FloatingProps extends CardPreviewProps {
  data: PreviewData
  /** The card's box when the preview opened. */
  cardBox: Box
  /** The card itself: when it leaves the page (removed from «Mi lista»), the preview closes. */
  card: HTMLElement
  onClose: () => void
}

type Phase = 'measure' | 'enter' | 'shown'

/** The panel, placed over its card. It is measured hidden, starts at the card's box and grows. */
function Floating({ data, cardBox, card, locale, labels, onClose }: FloatingProps) {
  const { short } = data
  const panel = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('measure')
  const [placement, setPlacement] = useState<Placement>(() =>
    placePreview({ card: cardBox, viewport: viewportSize(), bounds: pageBounds() }),
  )
  const [from, setFrom] = useState('none')
  const [saved, setSaved] = useState(() => has(short.slug))
  const [rating, setRatingState] = useState<Rating | undefined>(() => getRating(short.slug))

  useEffect(() => {
    const sync = () => setSaved(has(short.slug))
    sync()
    return subscribeList(sync)
  }, [short.slug])
  useEffect(() => {
    const sync = () => setRatingState(getRating(short.slug))
    sync()
    return subscribeRatings(sync)
  }, [short.slug])

  useLayoutEffect(() => {
    const element = panel.current
    if (!element) return
    const place = placePreview({
      card: cardBox,
      viewport: viewportSize(),
      bounds: pageBounds(),
      panelHeight: element.offsetHeight,
    })
    const grow = growFrom(cardBox, { ...place, height: element.offsetHeight })
    setPlacement(place)
    setFrom(`translate(${grow.x}px, ${grow.y}px) scale(${grow.scale})`)
    setPhase('enter')
  }, [cardBox])

  useEffect(() => {
    if (phase !== 'enter') return
    // One frame is painted at the card's box before the transition to the panel's own.
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase('shown'))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [phase])

  const style: CSSProperties & Record<'--preview-from', string> = {
    left: placement.left,
    top: placement.top,
    width: placement.width,
    visibility: phase === 'measure' ? 'hidden' : undefined,
    '--preview-from': from,
  }

  return createPortal(
    <ShortPreview
      ref={panel}
      style={style}
      entering={phase !== 'shown'}
      title={short.title}
      director={short.director}
      directedBy={short.director ? labels.directedBy.replace('{names}', short.director) : undefined}
      year={short.year}
      seconds={short.seconds}
      locale={locale}
      tone={short.tone}
      image={short.image}
      imageTextColor={short.imageTextColor}
      imageHasTitle={short.imageHasTitle}
      typeLabel={data.typeLabel}
      synopsis={data.synopsis}
      badges={data.badges}
      href={data.href}
      saved={saved}
      onToggleSaved={() => {
        const removing = saved
        toggle(short)
        // On «Mi lista» (its page and its rail) the card goes with it: so does its preview, once
        // the list has rendered without it.
        if (removing)
          requestAnimationFrame(() => {
            if (!card.isConnected) onClose()
          })
      }}
      rating={rating}
      onRate={(value) => setRating(short.slug, value)}
      onRemoveFromHistory={
        data.removableFrom
          ? () => {
              onClose()
              void removeFromHistory(short.slug, locale)
            }
          : undefined
      }
      labels={{
        ...labels,
        removeFromHistory:
          data.removableFrom === 'continueWatching'
            ? labels.removeFromContinueWatching
            : labels.removeFromHistory,
      }}
    />,
    document.body,
  )
}

function viewportSize() {
  return { width: document.documentElement.clientWidth, height: window.innerHeight }
}

/** The page container (`#main`): the panel never leaves it. Falls back to the viewport. */
function pageBounds() {
  const rect = document.getElementById('main')?.getBoundingClientRect()
  return rect ? { left: rect.left, right: rect.right } : { left: 0, right: viewportSize().width }
}

function token(name: string, fallback: number): number {
  return parseTime(getComputedStyle(document.documentElement).getPropertyValue(name), fallback)
}

/**
 * The floating preview of short cards, like a streaming service's: one island per page. Cards are
 * static markup marked with `data-short-card`; this listens to the page (event delegation), and
 * after the pointer rests on a card it floats a panel over it. A pointer enhancement only: devices
 * without a fine pointer that hovers get nothing, and the card is just a link.
 */
export function CardPreview(props: CardPreviewProps) {
  const [hoverable, setHoverable] = useState(false)
  const [open, setOpen] = useState<{ data: PreviewData; cardBox: Box; card: HTMLElement }>()
  const timer = useRef<PreviewTimer<HTMLElement>>(undefined)

  useEffect(() => {
    const query = window.matchMedia(HOVER)
    const sync = () => setHoverable(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!hoverable) return
    const next = createPreviewTimer<HTMLElement>({
      openDelay: token('--short-preview-delay-open', 450),
      closeDelay: token('--short-preview-delay-close', 150),
      onOpen: (card) => {
        const data = readCard(card)
        setOpen(data ? { data, cardBox: box(card.getBoundingClientRect()), card } : undefined)
      },
      onClose: () => setOpen(undefined),
    })
    timer.current = next

    const cardOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-short-card]') : null
    // The panel's enter and leave are read here too, from native events: React's own pointer
    // enter/leave miss the move from a card rendered by another React root (the «Mi lista» rail)
    // into this island's portal, and the panel closed under the pointer.
    const panelOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-short-preview]') : null
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const panel = panelOf(event.target)
      if (panel && !panel.contains(event.relatedTarget as Node | null)) next.enterPanel()
      const card = cardOf(event.target)
      if (card) next.enterCard(card)
    }
    const onOut = (event: PointerEvent) => {
      const panel = panelOf(event.target)
      if (panel && !panel.contains(event.relatedTarget as Node | null)) next.leavePanel()
      const card = cardOf(event.target)
      if (card && !card.contains(event.relatedTarget as Node | null)) next.leaveCard()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) next.close()
    }
    // A press on the page closes the preview (navigating, text selection…), but not one on the panel.
    const onDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element && event.target.closest('[data-short-preview]')))
        next.close()
    }
    const close = () => next.close()
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', close, { capture: true, passive: true })
    window.addEventListener('resize', close)
    return () => {
      next.close()
      timer.current = undefined
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [hoverable])

  if (!open) return null
  return (
    <Floating
      key={open.data.short.slug}
      {...props}
      {...open}
      onClose={() => timer.current?.close()}
    />
  )
}
