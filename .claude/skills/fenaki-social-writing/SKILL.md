---
name: fenaki-social-writing
description: Write and schedule FENAKI's social media posts (the «FENAKI en 7 días» challenge and later posts) per network — voice, vocabulary, structure, per-network formats, approval and Postiz scheduling. Use whenever drafting, editing or scheduling a FENAKI post.
---

# FENAKI social posts

## Voice

- FENAKI speaks as a brand, in the first person plural («construimos», «nos hemos propuesto»), never as a person. The owner never appears.
- Address the reader as «tú», in neutral Spanish for every Spanish speaker: no «vosotros», no Spain-only vocabulary.
- Clear and direct, with storytelling: a hook, a story, the facts, an ending. No hype, no superlatives, no emoji walls (one 🎬 at most).

## Vocabulary (must match the web and the emails)

- **FENAKI** in capitals, always. `fenaki.tv` and `hola@fenaki.tv` in lowercase.
- **email**, never «correo».
- **Lanzamiento** for the launch («Apúntate al lanzamiento», «te avisaremos del lanzamiento»; future tense, never «te avisamos»), as the web and the waitlist emails say. Not «estreno», not «abrir las puertas», no door metaphors at all.
- Inclusive nouns: **cineastas**, «quienes los dirigen»; not «autores» or «directores» as a generic.
- The tagline: **«El mejor cine, en cortos»**. What FENAKI is: the shorts that filmmakers, festivals and schools publish openly are spread across YouTube, Vimeo and festival sites; FENAKI gathers them in one place, with the experience of a streaming platform.
- Never pitch «gratis y legales» (no pull) and never call FENAKI curated or its shorts «elegidos uno a uno»: it goes for volume. Legality is a fact for the legal pages, not a selling point.
- Never mention the project's earlier name. The naming story starts at «buscábamos un nombre con gancho» and ends at the phenakistiscope (1832, Plateau and Stampfer; Greek «engañar al ojo»; loops of a second: the first shorts).
- No fixed launch date in posts: the challenge ends on day 7 (Saturday 31 Oct 2026) at the latest; «si estamos listos antes, abrimos antes».

## The challenge framing

«FENAKI en 7 días»: build and launch FENAKI in one week with AI. The experiment is that the AI works autonomously; the human part is **giving it access to what it cannot do by itself** (creating accounts, paying for the domain and the server, handing over keys). From there it manages: code, server, deployments, catalog, posts. Do not frame it as «the AI proposes, a person decides» except where a human really decides (publishing a short, approving a post).

## Every post

- Starts with what FENAKI is (or the day's hook, then what FENAKI is).
- Ends with the call to action and the line for organisations and filmmakers:
  «¿Diriges un festival, una escuela de cine o una productora, o has hecho un corto? Escríbenos a hola@fenaki.tv y añadiremos tus cortos a nuestro catálogo.»
- Facts only from the daily log (`private/diario/dia-NN.md`) and production data. Round numbers honestly («casi 14.000», «más de 37.000»), never invent figures.
- Hashtags at the end, few: `#cortometrajes #cine #buildinpublic` (+ one topical).

## Per network

| Network | Format | Tone |
| --- | --- | --- |
| **Instagram** | Carousel (see `fenaki-social-design`) + short caption: hook, what FENAKI is, the story, CTA | Story first, little tech |
| **Facebook** | Same caption and carousel as Instagram | Same |
| **LinkedIn** | Long post with bold-unicode section headers (𝗤𝘂𝗲́ 𝗲𝘀 𝗙𝗘𝗡𝗔𝗞𝗜…), technical detail (stack and why, MVP features, design system, the autonomy experiment), the carousel as a PDF document | Technical, product |
| **X, Bluesky, Threads** | A thread: first post with the card image and «🧵👇», then one idea per post, last post with CTA. Every post ≤ 280 characters (count them) | Short, punchy |
| **TikTok, YouTube Shorts** | Vertical video 30–40 s (script in the day's file); only when a video exists | Visual |

## Workflow

1. Draft the day in `private/diario/posts-dia-NN.md`: the common message, then each network's text, then the slide list.
2. Make the images with `fenaki-social-design`.
3. **Send texts and images to the user and wait for explicit approval.** Publishing is public and in the brand's name: never post or schedule without it, and ask again for each post.
4. Schedule with Postiz (MCP tools `mcp__postiz__*` or the `postiz` CLI; see the `postiz` skill). Every image must be uploaded through Postiz first (`postiz upload` / `uploadFromUrlTool`); raw paths are rejected. The connected channels are Instagram (standalone), Facebook page, Threads, X, LinkedIn page, YouTube, TikTok (business) and Bluesky; list them with `integrationList`.
5. Timing: day N's post goes out the next morning, or scheduled the same night, never in real time. Catch-up posts may go out the same day at different times when the user asks.
6. Confirm to the user what was scheduled, where and when; note it in the day's log.
