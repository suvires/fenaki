---
name: fenaki-social-design
description: Design FENAKI's social media images (Instagram/Facebook carousels, LinkedIn PDF documents, X/Bluesky/Threads cards) with the brand's typographic roles and the reusable renderer. Use whenever making or changing an image, slide or carousel for a FENAKI social post.
---

# FENAKI social images

Social pieces use the same design system as the web: same tokens, same font (Archivo), same typographic roles. Never invent colours, sizes or fonts for a post; if a role is missing, it belongs in the design system first (`packages/tokens`, `packages/ui`, docs).

## Formats

| Piece | Size | File | Where |
| --- | --- | --- | --- |
| Carousel slide | 1080 × 1350 | `carrusel-N.png` | Instagram, Facebook |
| LinkedIn document | the same slides as one PDF | `FENAKI-dia-N.pdf` | LinkedIn («documento»: it pages like a carousel) |
| Card | 1200 × 675 | `horizontal.png` | X, Bluesky, Threads (first post of the thread) |

Keep each day's pieces in `private/diario/anexos/redes/dia-NN/`, next to its `spec.json`.

## Typographic roles (same as the web)

| Role | Style | Carousel size |
| --- | --- | --- |
| **Headline** | Archivo display: weight 800, uppercase, condensed (`wdth` 75), line-height 0.92, white (`text-primary`) | 136 px, the size at which «El mejor cine,» fills one line (smaller only for a single long word, e.g. «Fenaquistiscopio» at 104 px). Break lines with `\n` in the spec |
| **Kicker** (eyebrow) | Archivo weight 500, uppercase, letter-spacing 0.06 em, accent colour | 40 px |
| **Lead** (under the headline) | Archivo weight 400, line-height 1.35, white | 44 px on every slide |
| **Secondary** (contact line, counter «N / total →», footnotes) | Archivo weight 400, muted grey (`text-secondary`) | 32 px |
| **Domain** | `fenaki.tv`, lowercase, weight 700, accent colour | 88 px |

Rules:
- Headlines are **all white** and have **no final full stop**: «El mejor cine, en cortos» · «Construir FENAKI en una semana» · «Apúntate al lanzamiento». The accent colour is only for the kicker and the domain (27 oct 2026: a two-tone headline breaks the line and the rhythm).
- The brand is always **FENAKI** in capitals; the domain always lowercase (`fenaki.tv`, `hola@fenaki.tv`).
- The wordmark (`packages/ui/src/assets/wordmark.svg`) goes top-left on every piece. When the brand name is the subject of a slide, show the wordmark, never the word typed in the text font.

## Backgrounds

- **`catalog`**: the catalog screenshot in perspective, **blurred until no short or still can be recognised** (third-party thumbnails are not ours to use as promotion), dimmed and faded to the page colour at top and bottom. For opening, challenge and call-to-action slides.
- **`glow`**: the page colour with the light from above, as on the web's home. For story and illustration slides.
- Illustrations are drawn with the brand colours (e.g. the phenakistiscope disc). No stock photos, no third-party images; historical public-domain images only if the user approves.

## Carousel structure

1. **What FENAKI is**, before anything else: «El mejor cine, en cortos».
2. The day's **hook** («Día N de 7» as kicker).
3–4. The **story or the data** of the day, one idea per slide.
Last. **Call to action**: «Apúntate al lanzamiento», the domain, and as secondary text the line for organisations and filmmakers.

At most 5 slides. Anything technical or explanatory that does not work as an image (stack, palette, how the AI works) goes in the post text, not on a slide.

## Rendering

Write a `spec.json` and run the renderer from the repository root:

```bash
node .claude/skills/fenaki-social-design/render.mjs private/diario/anexos/redes/dia-NN/spec.json
```

```json
{
  "out": "/abs/path/private/diario/anexos/redes/dia-NN",
  "pdf": "FENAKI-dia-N.pdf",
  "slides": [
    { "bg": "catalog", "headline": "El mejor cine, en cortos", "lead": "…" },
    { "bg": "catalog", "kicker": "Día N de 7", "headline": "Construir FENAKI en una semana", "lead": "…" },
    { "bg": "glow", "disc": true, "headline": "Fenaquistiscopio 1832", "headlineSize": 96, "lead": "…", },
    { "bg": "catalog", "headline": "Apúntate al lanzamiento", "lead": "…", "domain": true, "secondary": "¿Diriges un festival…" }
  ],
  "card": { "bg": "catalog", "kicker": "Día N de 7", "headline": "…" }
}
```

It reads the tokens from `@fenaki/tokens` and the fonts from `apps/web`'s dependencies, numbers the slides «N / total →» unless a slide has `secondary`, and writes the PDF from the same PNGs. Day 1's spec is a working example: `private/diario/anexos/redes/dia-01/spec.json`.

## Before showing it

The renderer warns when a slide's content overflows. Keep a slide to a headline of at most four lines (lower `headlineSize`, e.g. 120, for long headlines) and a lead of at most three lines; split the idea into two slides or move it to the post text rather than squeezing.

Open every PNG and check: nothing overflows or wraps badly (a lone word on the last line of a headline), the accent is on the payoff, no full stops on headlines, FENAKI in capitals and the domain lowercase, no recognisable third-party image. Send the images to the user for approval before anything is scheduled.
