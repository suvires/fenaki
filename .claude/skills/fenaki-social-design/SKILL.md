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
| Vertical video | 1080 × 1920, about 30 s, silent | `FENAKI-dia-N-vertical.mp4` (from the `video` block of a spec) | TikTok, YouTube Shorts |
| Card | 1200 × 675 | `horizontal.png` | Only the first post of the X, Bluesky and Threads thread (not Instagram, not LinkedIn) |

Keep each day's pieces in `private/diario/anexos/redes/dia-NN/`, next to its `spec.json`.

## Typographic roles (same as the web)

| Role | Style | Carousel size |
| --- | --- | --- |
| **Headline** | Archivo display: weight 800, uppercase, condensed (`wdth` 75), line-height 0.92, white (`text-primary`) | 130 px on every slide. Smaller only for a single long word that cannot break («Fenaquistiscopio» at 104 px) |
| **Kicker** (eyebrow) | Archivo weight 500, uppercase, letter-spacing 0.06 em, accent colour | 40 px |
| **Lead** (under the headline) | Archivo weight 400, line-height 1.35, white | 44 px on every slide, never smaller to fit |
| **Secondary** (contact line, counter «N / total →», image credits) | Archivo weight 400, muted grey (`text-secondary`) | 32 px |
| **Domain** | `fenaki.tv`, lowercase, weight 400 (regular, not bold), accent colour | 88 px |

Rules:
- Headlines are **all white** and have **no final full stop**: «El mejor cine, en cortos» · «Construir FENAKI en una semana» · «Apúntate al lanzamiento». The accent colour is only for the kicker and the domain (27 oct 2026: a two-tone headline breaks the line and the rhythm; the web follows the same rule).
- **Break headlines by hand** with `\n`, by meaning, and keep them to three lines: «El mejor cine,\nen cortos» · «Construir\nFENAKI en\nuna semana». No lone short word on a line, no line much longer than the others. The renderer warns when a line wraps beyond the explicit breaks: then rephrase or move the break, don't shrink the size.
- The renderer keeps the last two words of the lead and the secondary text together (no widow like «día.» alone); still read every lead as it renders.
- The brand is always **FENAKI** in capitals; the domain always lowercase (`fenaki.tv`, `hola@fenaki.tv`).
- The wordmark (`packages/ui/src/assets/wordmark.svg`) goes top-left on every piece. When the brand name is the subject of a slide, show the wordmark, never the word typed in the text font.
- Slides never tell the reader how to use them («pasa rápido», «desliza»): the image has to work on its own.

## Backgrounds and images

- **`catalog`**: the catalog screenshot in perspective, **blurred until no short or still can be recognised** (third-party thumbnails are not ours to use as promotion), dimmed and faded to the page colour at top and bottom. For opening, challenge and call-to-action slides.
- **`glow`**: the page colour with the light from above, as on the web's home. For story and illustration slides.
- **`disc: true`**: a phenakistiscope drawn with the brand colours (outline only, no grey fill, no dotted rings; the arrow follows the spin). A fallback when no real image fits.
- **Historical images**: public domain only, approved by the user, background removed so they sit on the page colour, and **credited on the slide** as secondary text: author, year, source («Disco de Eadweard Muybridge, 1893. Library of Congress.»). Say exactly what the image is: Muybridge's 1893 disc is not Plateau's 1832 phenakistiscope, so the text must not imply it. No stock photos, no thumbnails of third-party shorts.

## Carousel structure

1. **What FENAKI is**, before anything else: «El mejor cine, en cortos». Only on day 1's carousel: from day 2 on the carousel opens with the day's hook, because followers have already seen it (the post text still says what FENAKI is). Vertical videos keep it as their first scene, since each one is seen on its own.
2. The day's **hook** («Día N de 7» as kicker).
3–4. The **story or the data** of the day, one idea per slide.
Optional: a **flip-book**, frame slides after the image they come from (see below).
Last. **Call to action**: «Apúntate al lanzamiento», the domain, and as secondary text the line for organisations and filmmakers.

At most 5 slides of text. Anything technical or explanatory that does not work as an image (stack, palette, how the AI works) goes in the post text, not on a slide. Day 1 (13 slides): «El mejor cine, en cortos» → «Día 1 de 7 · Construir FENAKI en una semana» → «El nombre · Fenaquistiscopio» → Muybridge's disc with its credit → 8 frames → «Apúntate al lanzamiento».

### Flip-book

A run of `frame` slides plays the animation when swiped. Use 8 frames or so, not the whole cycle (13 felt too long), picked evenly so the movement still reads; with the text slides the total stays within Instagram's 20. Frame slides carry no text and no counter.

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
    { "bg": "catalog", "headline": "El mejor cine,\nen cortos", "lead": "…" },
    { "bg": "catalog", "kicker": "Día N de 7", "headline": "Construir\nFENAKI en\nuna semana", "lead": "…" },
    { "bg": "glow", "kicker": "El nombre", "headline": "Fenaquistiscopio", "headlineSize": 104, "lead": "…" },
    { "bg": "glow", "image": "/abs/path/disco.png", "imageSize": 700, "lead": "…", "secondary": "Autor, año. Fuente." },
    { "bg": "glow", "frame": true, "image": "/abs/path/frame-01.png" },
    { "bg": "catalog", "headline": "Apúntate al\nlanzamiento", "lead": "…", "domain": true, "secondary": "¿Diriges un festival…" }
  ],
  "card": { "bg": "catalog", "kicker": "Día N de 7", "headline": "…" }
}
```

Slide fields: `bg` (`catalog` | `glow`), `kicker`, `headline`, `headlineSize`, `lead`, `domain`, `secondary`, `disc` + `discSize`, `image` + `imageSize` (shown above the text), `frame: true` with an `image` (full-bleed animation frame, edges faded into the page colour, wordmark only).

It reads the tokens from `@fenaki/tokens` and the fonts from `apps/web`'s dependencies, numbers the slides «N / total →» unless a slide has `secondary`, and writes the PDF from the same PNGs plus the card. Day 1's spec is a working example: `private/diario/anexos/redes/dia-01/spec.json`.

## Vertical video

Add a `"video": { "file": "FENAKI-dia-N-vertical.mp4", "scenes": [...] }` block (day 1: `dia-01/video.json`). A scene is a slide plus `seconds`; a scene with `"frames": [png…]` plays them in a loop (`fps` 12, `loops` 5) under its kicker and lead, with the credit as `secondary`. Scenes are joined with 0.4 s crossfades. Text stays inside TikTok's safe area: 200 px clear at the top, 420 px at the bottom (caption and buttons), 120 px on the right. Open the scene PNGs in `video/` before sending.

Day 1's story: the dancing couple with «1893» and Muybridge → «Fenaquistiscopio» → the dance again with «los primeros cortos de la historia» → «El mejor cine, en cortos» → «Construir FENAKI en una semana» → «Apúntate al lanzamiento». The video goes out silent: add music in the app only from its licensed library, never a track of ours.

## Before showing it

The renderer warns when a slide overflows vertically or horizontally, or when a headline wraps beyond its `\n` breaks. Fix every warning by rephrasing or splitting the idea, not by shrinking the type: a slide holds a headline of at most three lines and a lead of at most three or four lines.

Open every PNG and check: nothing overflows or wraps badly, no full stops on headlines, headlines all white, FENAKI in capitals and the domain lowercase, historical images credited, no recognisable third-party image, and the slide texts match the post texts word for word where they say the same thing. Send the images to the user for approval before anything is scheduled.
