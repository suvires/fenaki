/**
 * Open Graph images in the brand style: a typographic card built from the design tokens and the
 * self-hosted fonts. The OG image stays generated: stills are not used here. Satori lays it out as SVG (text as paths) and sharp
 * turns it into a PNG.
 */
import { palettes } from '@fenaki/tokens'
import wordmark from '@fenaki/ui/wordmark.svg?raw'
import homeBackdrop from '../assets/og-home-backdrop.png?inline'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import sharp from 'sharp'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
const PADDING_Y = 56
const INNER_HEIGHT = OG_HEIGHT - 2 * PADDING_Y
const HOLE_WIDTH = 14
const GUTTER = 48
/** Satori leaves padding out of an element's size, so the layout uses fixed widths instead. */
const CONTENT_WIDTH = OG_WIDTH - 40 - HOLE_WIDTH - GUTTER - 72

export type OgTone = 'sala' | 'tungsteno' | 'plata' | 'telon'

export interface OgCard {
  /** The kind of page, in the timecode voice: «Cortometraje · 11 min». */
  eyebrow: string
  title: string
  /** Director and year, a showcase's kind, a person's roles. */
  subtitle?: string
  tagline: string
  siteName: string
  tone?: OgTone
  /**
   * The home page's card: the tilted catalog behind the text, as on the landing page, with the
   * title broken after its comma and the address at the foot (scripts/og-backdrop.mjs).
   */
  home?: boolean
}

const color = palettes.dark

/** Ground and ink per tone, as the typographic posters use them. */
const TONES: Record<OgTone, { ground: string; ink: string; muted: string; accent: string }> = {
  sala: {
    ground: color['sala-0'] ?? '',
    ink: color.ink ?? '',
    muted: color['ink-muted'] ?? '',
    accent: color.tungsteno ?? '',
  },
  tungsteno: {
    ground: color.tungsteno ?? '',
    ink: color['on-tungsteno'] ?? '',
    muted: color['on-tungsteno'] ?? '',
    accent: color['on-tungsteno'] ?? '',
  },
  plata: {
    ground: color['plata-soft'] ?? '',
    ink: color.ink ?? '',
    muted: color.plata ?? '',
    accent: color.plata ?? '',
  },
  telon: {
    ground: color.telon ?? '',
    ink: color['on-telon'] ?? '',
    muted: color['on-telon'] ?? '',
    accent: color['on-telon'] ?? '',
  },
}

/** Title size by length, so short titles fill the card and long ones still fit. */
export function titleSize(title: string): number {
  const length = title.length
  if (length <= 12) return 156
  if (length <= 22) return 120
  if (length <= 36) return 92
  if (length <= 60) return 70
  return 56
}

/** Static Archivo instances cut from the site's variable font (packages/tokens/scripts/og-fonts.py): satori reads no variable fonts. */
const fontFile = (name: string) =>
  readFile(fileURLToPath(import.meta.resolve(`@fenaki/tokens/og-fonts/${name}`)))

let fonts: Promise<Parameters<typeof satori>[1]['fonts']> | undefined

function loadFonts() {
  fonts ??= Promise.all([
    fontFile('archivo-display-75-800.woff'),
    fontFile('archivo-text-100-600.woff'),
    fontFile('archivo-label-100-500.woff'),
  ]).then(([display, text, mono]) => [
    { name: 'display', data: display, weight: 800 as const, style: 'normal' as const },
    { name: 'text', data: text, weight: 600 as const, style: 'normal' as const },
    { name: 'mono', data: mono, weight: 500 as const, style: 'normal' as const },
  ])
  return fonts
}

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown> } }
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
})

/** The logo from the design system, as the site draws it, in the card's ink. */
const WORDMARK_HEIGHT = 44
const WORDMARK_RATIO = (() => {
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(wordmark)
  return box ? Number(box[1]) / Number(box[2]) : 3
})()

function wordmarkDataUri(ink: string): string {
  const svg = wordmark.replace(/currentColor/g, ink)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const HOME_TEXT_WIDTH = 820

/** The home page's card: the catalog in perspective on the right, the promise on the left. */
function homeTree(card: OgCard): Node {
  const tone = TONES.sala
  // «El mejor cine, en cortos» on two lines, never with a word left alone on the second.
  const lines = card.title.split(/(?<=,)\s+/)
  return el(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      position: 'relative',
      background: tone.ground,
      color: tone.ink,
    },
    [
      {
        type: 'img',
        props: {
          src: homeBackdrop,
          width: OG_WIDTH,
          height: OG_HEIGHT,
          style: { position: 'absolute', left: 0, top: 0, opacity: 0.55 },
        },
      },
      // The page colour from the left, under the text, fading out over the catalog.
      el('div', {
        position: 'absolute',
        left: 0,
        top: 0,
        width: OG_WIDTH,
        height: OG_HEIGHT,
        backgroundImage: `linear-gradient(to right, ${tone.ground} 45%, transparent 85%)`,
      }),
      el(
        'div',
        {
          position: 'absolute',
          left: 72,
          top: PADDING_Y,
          width: HOME_TEXT_WIDTH,
          height: INNER_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
        [
          {
            type: 'img',
            props: {
              src: wordmarkDataUri(tone.ink),
              alt: card.siteName,
              height: WORDMARK_HEIGHT,
              width: Math.round(WORDMARK_HEIGHT * WORDMARK_RATIO),
            },
          },
          el('div', { display: 'flex', flexDirection: 'column', gap: 24 }, [
            el(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'display',
                fontSize: 96,
                whiteSpace: 'nowrap',
                lineHeight: 0.92,
                textTransform: 'uppercase',
              },
              lines.map((line) => el('div', {}, line)),
            ),
            ...(card.subtitle
              ? [el('div', { fontFamily: 'text', fontSize: 34, color: tone.ink }, card.subtitle)]
              : []),
          ]),
          el(
            'div',
            {
              fontFamily: 'mono',
              fontSize: 28,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: tone.accent,
            },
            card.eyebrow,
          ),
        ],
      ),
    ],
  )
}

/** The card as Satori's element tree (React-like objects, no JSX needed). */
export function ogTree(card: OgCard): Node {
  if (card.home) return homeTree(card)
  const tone = TONES[card.tone ?? 'sala']
  const holes = Array.from({ length: 13 }, () =>
    el('div', {
      width: HOLE_WIDTH,
      height: 18,
      borderRadius: 3,
      background: tone.muted,
      opacity: 0.55,
    }),
  )
  return el(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      background: tone.ground,
      color: tone.ink,
      alignItems: 'center',
    },
    [
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: INNER_HEIGHT,
          marginLeft: 40,
          marginRight: GUTTER,
        },
        holes,
      ),
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: CONTENT_WIDTH,
          height: INNER_HEIGHT,
        },
        [
          el(
            'div',
            {
              fontFamily: 'mono',
              fontSize: 28,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: tone.accent,
            },
            card.eyebrow,
          ),
          el('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
            el(
              'div',
              {
                fontFamily: 'display',
                fontSize: titleSize(card.title),
                lineHeight: 0.92,
                textTransform: 'uppercase',
                display: 'flex',
                flexWrap: 'wrap',
              },
              card.title,
            ),
            ...(card.subtitle
              ? [el('div', { fontFamily: 'text', fontSize: 34, color: tone.muted }, card.subtitle)]
              : []),
          ]),
          el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, [
            {
              type: 'img',
              props: {
                src: wordmarkDataUri(tone.ink),
                alt: card.siteName,
                height: WORDMARK_HEIGHT,
                width: Math.round(WORDMARK_HEIGHT * WORDMARK_RATIO),
              },
            },
            el(
              'div',
              { fontFamily: 'mono', fontSize: 24, textTransform: 'uppercase', color: tone.muted },
              card.tagline,
            ),
          ]),
        ],
      ),
    ],
  )
}

export async function renderOgImage(card: OgCard): Promise<Buffer> {
  const svg = await satori(ogTree(card) as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: await loadFonts(),
  })
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}

/** An OG image response: cached for a day by browsers and the CDN. */
export function ogResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
