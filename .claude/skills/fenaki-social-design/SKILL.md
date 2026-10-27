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
| **Headline** | Archivo display: weight 800, uppercase, condensed (`wdth` 75), line-height 0.92, white (`ink`) | 146 px (96 px when it shares the slide with an illustration) |
| **Accent in the headline** | The closing phrase that carries the payoff, in the accent colour (`tungsteno`). Exactly one span per headline; never the whole headline, never the brand name | — |
| **Kicker** (eyebrow) | Archivo weight 500, uppercase, letter-spacing 0.06 em, accent colour | 40 px |
| **Lead** (under the headline) | Archivo weight 400, line-height 1.35, white | 48 px (40 px under an illustration) |
| **Secondary** (contact line, counter «N / total →», footnotes) | Archivo weight 400, muted grey (`ink-muted`) | 32 px |
| **Domain** | `fenaki.tv`, lowercase, weight 700, accent colour | 88 px |

Rules:
- Headlines have **no final full stop**. Examples: «El mejor cine, *en cortos*» · «Construir FENAKI *en una semana*» · «Los primeros cortos duraban *un segundo*» · «Apúntate *al lanzamiento*».
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
    { "bg": "catalog", "headline": ["El mejor cine,", "en cortos"], "lead": "…" },
    { "bg": "catalog", "kicker": "Día N de 7", "headline": ["White part", "accent part"], "lead": "…" },
    { "bg": "glow", "disc": true, "headline": ["Fenaquistiscopio", "1832"], "headlineSize": 96, "lead": "…", "leadSize": 40 },
    { "bg": "catalog", "headline": ["Apúntate", "al lanzamiento"], "lead": "…", "domain": true, "secondary": "¿Diriges un festival…" }
  ],
  "card": { "bg": "catalog", "kicker": "Día N de 7", "headline": ["…", "…"] }
}
```

It reads the tokens from `@fenaki/tokens` and the fonts from `apps/web`'s dependencies, numbers the slides «N / total →» unless a slide has `secondary`, and writes the PDF from the same PNGs. Day 1's spec is a working example: `private/diario/anexos/redes/dia-01/spec.json`.

## Before showing it

Open every PNG and check: nothing overflows or wraps badly (a lone word on the last line of a headline), the accent is on the payoff, no full stops on headlines, FENAKI in capitals and the domain lowercase, no recognisable third-party image. Send the images to the user for approval before anything is scheduled.
