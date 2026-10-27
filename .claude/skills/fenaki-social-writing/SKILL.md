---
name: fenaki-social-writing
description: Write and schedule FENAKI's social media posts (the «FENAKI en 7 días» challenge and later posts) per network — voice, vocabulary, structure, per-network formats, approval and Postiz scheduling. Use whenever drafting, editing or scheduling a FENAKI post.
---

# FENAKI social posts

## Voice

- FENAKI speaks as a brand, in the first person plural («construimos», «nos hemos propuesto»), never as a person. The owner never appears.
- Address the reader as «tú», in neutral Spanish for every Spanish speaker: no «vosotros», no Spain-only vocabulary.
- Clear and direct, with storytelling: a hook, a story, the facts, an ending. No hype, no superlatives, no emoji walls (one 🎬 at most).
- **Literal, not metaphorical.** Say what happened: «hizo moverse unos dibujos al girar», not «los dibujos cobraban vida». Facts carry the story.
- **Impersonal for how things worked**: «Se hacía girar frente a un espejo y, mirando por las rendijas, se veía a la pareja bailar», not «lo girabas y veías».
- **Results, not process.** Say what the viewer gets («antes de cargarlos, te explicamos qué datos reciben y te pedimos permiso»), not how we got there (measuring in a clean browser, agents in branches, what a legal notice requires).
- Short sentences, one idea each. If a slide or a post reads long, cut an idea, don't compress it.
- Never tell the reader how to read the piece («pasa rápido», «desliza»).
- No personification either: not «el navegador habla con el panel», «que el texto diga la verdad», «lo que sobra se vuelve en contra». Write what happens: «el navegador no se conecta al panel», «para que sea exacto».
- **Exact claims.** «No usamos cookies que necesiten tu permiso», not «no usamos cookies»: the account session is a cookie. Check every absolute against the code before writing it.
- Spanish punctuation: no comma after «pero» when the subject follows («…tu permiso, pero los reproductores…»).
- **Say when, not «hoy».** Day N goes out a day or more later: «El segundo día desarrollamos…», not «Hoy…».

## Vocabulary (must match the web and the emails)

- **FENAKI** in capitals, always. `fenaki.tv` and `hola@fenaki.tv` in lowercase.
- **email**, never «correo».
- **Lanzamiento** for the launch («Apúntate al lanzamiento», «te avisaremos del lanzamiento»; future tense, never «te avisamos»), as the web and the waitlist emails say. Not «estreno», not «abrir las puertas», no door metaphors at all.
- Inclusive nouns: **cineastas**, «quienes los dirigen»; not «autores» or «directores» as a generic.
- The tagline: **«El mejor cine, en cortos»**. What FENAKI is, in these words: «Los cortos que cineastas, festivales y escuelas publican en abierto están repartidos por diferentes canales. FENAKI los reúne en un solo sitio, con la experiencia de una plataforma de streaming.» («diferentes canales», not a list of platforms; «con la experiencia de», not «como»).
- The challenge in copy: «construir FENAKI en una semana» («FENAKI en 7 días» is the series name; «Día N de 7» is the kicker).
- Never pitch «gratis y legales» (no pull) and never call FENAKI curated or its shorts «elegidos uno a uno»: it goes for volume. Legality is a fact for the legal pages, not a selling point.
- Never mention the project's earlier name. The naming story starts at «buscábamos un nombre con gancho» and centres on the word: **fenaquistiscopio**, the disc that in 1832 made drawings move as it spun (Plateau and Stampfer), Greek for «engañar al ojo», hence FENAKI. Its loops lasted about a second: the first shorts. Reference wording: «Así se llamó el disco que, en 1832, hizo moverse unos dibujos al girar. En griego significa «engañar al ojo», y de ahí viene FENAKI.»
- Images get the exact credit, and the text must not mix them up: the waltzing couple is Eadweard Muybridge's disc (1893, Library of Congress), not the 1832 original.
- No fixed launch date in posts: the challenge ends on day 7 (Saturday 31 Oct 2026) at the latest; «si estamos listos antes, abrimos antes».

## The challenge framing

«FENAKI en 7 días»: build and launch FENAKI in one week with AI. The experiment is that the AI works autonomously; the human part is **giving it access to what it cannot do by itself** (creating accounts, paying for the domain and the server, handing over keys). From there it manages: code, server, deployments, catalog, posts. Do not frame it as «the AI proposes, a person decides» except where a human really decides (publishing a short, approving a post).

## Every post

- Starts with the day's hook, in the words of the carousel's first slide, then what FENAKI is.
- **Follows the carousel**: one paragraph per slide, in the same order, opening with that slide's kicker («El catálogo: …», «Tu cuenta: …», «Privado y seguro: …») and reusing its sentence. Anything not on a slide is extra and must earn its place (LinkedIn's technical detail).
- Ends with the call to action and the line for organisations and filmmakers:
  «¿Diriges un festival, una escuela de cine o una productora, o has hecho un corto? Escríbenos a hola@fenaki.tv y añadiremos tus cortos a nuestro catálogo.»
- Facts only from the daily log (`private/diario/dia-NN.md`) and production data. Round numbers honestly («casi 14.000», «más de 37.000»), never invent figures.
- Hashtags at the end, few: `#cortometrajes #cine #buildinpublic` (+ one topical).

## Per network

| Network | Format | Tone |
| --- | --- | --- |
| **Instagram** | Carousel (see `fenaki-social-design`) + short caption: hook, what FENAKI is, the story, CTA | Story first, little tech |
| **Facebook** | Same caption and carousel as Instagram | Same |
| **LinkedIn** | Long post in short paragraphs, no section headers: each paragraph opens with a sentence that says what it is about («Lo primero fue el nombre.», «El experimento es que…»). LinkedIn has no bold, a plain header runs into its text, and «bold» Unicode letters (𝗤𝘂𝗲́) are not accessible: screen readers spell them out or skip them, search ignores them, some devices show boxes. Lists with «·» after a sentence ending in a colon are fine. Covers technical detail (stack and why, MVP features, design system, the autonomy experiment), the carousel as a PDF document | Technical, product |
| **X, Bluesky, Threads** | A thread: first post with the card image and «🧵👇», then one idea per post, last post with CTA. Every post ≤ 280 characters (count them). An idea never spills into the next post: a post that starts «Por eso…» is dangling, merge it and cut elsewhere | Short, punchy |
| **TikTok, YouTube Shorts, Reels, story** | The day's vertical video with a short caption (hook, what was built, CTA; YouTube and Reels add the contact line). YouTube needs a title («<Tema> · FENAKI, día N de 7») and the vertical thumbnail | Visual |

## Workflow

1. Draft the day in `private/diario/posts-dia-NN.md`: the common message, each network's text, and the final slide list (kept in sync with `spec.json`; delete superseded versions instead of striking them through).
   Every network says the same facts with the same words as the slides; when a slide changes, update the texts in the same pass. Count the characters of every thread post with a script, not by eye.
2. Make the images with `fenaki-social-design`.
3. **Send texts and images to the user and wait for explicit approval.** Publishing is public and in the brand's name: never post or schedule without it, and ask again for each post.
4. Publish or schedule with Postiz. What worked on days 1 and 2:
   - Upload local images with `postiz upload <file>` (the MCP upload only takes public URLs). Postiz rejects PDFs: for LinkedIn, send the carousel PNGs with the setting `post_as_images_carousel: true` and a `carousel_name`, and LinkedIn shows them as a document.
   - Content is HTML: one `<p>` per paragraph and an empty `<p></p>` for each blank line.
   - Give every image an `alt` with the slide's text (frames: «Fotograma N de 8 del disco…»).
   - Limits Postiz enforces: LinkedIn 3,000 characters, X 280, Bluesky 300, Threads 500, Instagram caption 2,200. Count the LinkedIn post before sending it. Instagram took a 13-image carousel.
   - A thread is one post with its replies as `postsAndComments` items; X, Bluesky and Threads go in one call.
   - Video settings: **TikTok** `content_posting_method: DIRECT_POST`, `privacy_level: PUBLIC_TO_EVERYONE`, `duet`/`stitch` false, `comment` true, `autoAddMusic: no`, brand toggles false, `video_made_with_ai` false (our videos are compositions, not generated footage). **YouTube** `title`, `type: public`, `selfDeclaredMadeForKids: no`, `tags`, and `thumbnail` {id, path} with the 2160 × 3840 PNG (needs the phone-verified channel, done on 27 oct 2026). **Instagram** a Reel is `post_type: post` with the video; the story is `post_type: story`. **Facebook** `post_type: post` with a `title`.
   - A thumbnail or any setting can be changed until the post goes out with `postSettingsTool`; after that only in the network's own app (Postiz cannot edit a published post).
   - Times are UTC: Spain is UTC+1 from the last Sunday of October (21:46 in Spain = 20:46 UTC). Check with `postiz posts:list` over a window that contains the publish time, and read `releaseURL` there once they go out (the MCP list does not return it).
   - A YouTube «ERROR» about the thumbnail still uploads the video: check it is public (`youtube.com/oembed?url=…` answers 200).
   Tools: MCP `mcp__postiz__*` or the `postiz` CLI (see the `postiz` skill). Every image must be uploaded through Postiz first; raw paths are rejected. The connected channels are Instagram (standalone), Facebook page, Threads, X, LinkedIn page, YouTube, TikTok (business) and Bluesky; list them with `integrationList`.
5. Timing: by default day N's post goes out the next morning, or scheduled the same night. The user may ask to publish right away (day 1 went out at once on 27 oct 2026, from 14:50 UTC) or name a time (day 2: 21:46).
   Expect several rounds of review on wording and images: apply each change to the slides, the video and every network's text in the same pass, re-render, and send the changed pieces again.
6. Confirm to the user what was scheduled, where and when; note it in the day's log.
