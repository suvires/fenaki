// Renders FENAKI social pieces from a JSON spec, with the design system's tokens and fonts.
//   node .claude/skills/fenaki-social-design/render.mjs <spec.json>
// Spec: { "out": "<dir>", "pdf": "<name>.pdf"?, "slides": [Slide], "card": Slide? }
// Slide: { "bg": "catalog" | "glow", "kicker"?, "headline": "…",
//          "headlineSize"?, "lead"?, "leadSize"?, "domain"?: true, "secondary"?, "disc"?: true }
// Carousel slides are 1080×1350 (carrusel-N.png, numbered «N / total»); the card is 1200×675 (horizontal.png).
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(`${root}apps/web/package.json`)
const { chromium } = require('@playwright/test')
const { palettes } = await import(pathToFileURL(require.resolve('@fenaki/tokens')).href)
const c = palettes.dark
const spec = JSON.parse(await readFile(process.argv[2], 'utf8'))
const font = (await readFile(require.resolve('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'))).toString('base64')
const shot = (await readFile(`${root}apps/web/src/assets/landing-catalog.webp`)).toString('base64')
const wm = `data:image/svg+xml;base64,${Buffer.from((await readFile(`${root}packages/ui/src/assets/wordmark.svg`, 'utf8')).replace(/currentColor/g, c['text-primary'])).toString('base64')}`

// Typographic roles (same as the web): see SKILL.md.
const SIZE = { headline: 146, kicker: 40, lead: 48, secondary: 32, domain: 88 }

function figure(t) {
  // One phase of a jump: crouch → take-off → top → landing. Drawn upright, feet at y=0.
  const h = Math.sin(t * Math.PI), crouch = 1 - h
  const lift = -h * 56, d = crouch * 16, knee = 12 + crouch * 22, armUp = h * 46
  const ink = c['text-primary'], limb = `stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"`
  const shadow = `<ellipse cx="0" cy="6" rx="${30 - h * 12}" ry="7" fill="${c['background-canvas']}" opacity="${0.9 - h * 0.5}"/>`
  return `${shadow}<g transform="translate(0 ${lift})">
    <polyline ${limb} points="-11,0 ${-knee},${-30 + d / 2} -3,${-60 + d}"/><polyline ${limb} points="11,0 ${knee},${-30 + d / 2} 3,${-60 + d}"/>
    <line ${limb} stroke-width="14" x1="0" y1="${-60 + d}" x2="0" y2="${-108 + d}"/>
    <polyline ${limb} points="${-30},${-82 + d - armUp} -8,${-100 + d} 8,${-100 + d} 30,${-82 + d - armUp}"/>
    <circle cx="-30" cy="${-82 + d - armUp}" r="6" fill="${ink}"/><circle cx="30" cy="${-82 + d - armUp}" r="6" fill="${ink}"/>
    <circle cx="0" cy="${-130 + d}" r="18" fill="${ink}"/>
  </g>`
}
/** The phenakistiscope disc: 8 phases of a jumping figure, slits and a spin arrow. */
function disc(size) {
  const r = 500, n = 8, p = []
  p.push(`<circle r="${r}" fill="${c['background-muted']}" stroke="${c['border-strong']}" stroke-width="5"/>`)
  // The slit band, as on Plateau's discs, and a dotted decorative ring inside it.
  p.push(`<circle r="${r - 52}" fill="none" stroke="${c['background-raised']}" stroke-width="104"/>`)
  for (let i = 0; i < 48; i++) p.push(`<circle r="5" cx="0" cy="${-(r - 120)}" fill="${c['border-strong']}" transform="rotate(${i * 7.5})"/>`)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360
    p.push(`<rect x="-12" y="${-r + 12}" width="24" height="80" rx="12" fill="${c['background-canvas']}" transform="rotate(${a})"/>`)
    p.push(`<g transform="rotate(${a + 22.5}) translate(0 -150) scale(1.15)">${figure(i / n)}</g>`)
  }
  p.push(`<circle r="70" fill="${c['background-canvas']}" stroke="${c['border-strong']}" stroke-width="5"/><circle r="40" fill="none" stroke="${c.accent}" stroke-width="6"/><circle r="12" fill="${c['text-primary']}"/>`)
  // Spin arrow: a clockwise arc over the top of the disc, its head tangent to the arc at the end.
  const R = r + 40, rad = (x) => (x * Math.PI) / 180, a0 = -48, a1 = 44
  const pt = (a) => [R * Math.sin(rad(a)), -R * Math.cos(rad(a))]
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
  p.push(`<path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${c.accent}" stroke-width="12" stroke-linecap="round"/>`)
  p.push(`<g transform="translate(${x1} ${y1}) rotate(${a1})"><polygon points="-6,-26 34,0 -6,26" fill="${c.accent}"/></g>`)
  return `<svg width="${size}" height="${size}" viewBox="-580 -580 1160 1160">${p.join('')}</svg>`
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const css = (w, h, catalog, scale) => `@font-face{font-family:A;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}body{width:${w}px;height:${h}px;overflow:hidden;background:${c['background-canvas']};color:${c['text-primary']};font-family:A,sans-serif;position:relative}
.bg{position:absolute;inset:0;overflow:hidden;perspective:1600px;${catalog ? '' : 'display:none'}}
.bg img{position:absolute;left:50%;top:50%;width:${Math.round(w * 1.5)}px;transform:translate(-45%,-46%) rotateX(32deg) rotateZ(-8deg);filter:blur(14px) saturate(.8);opacity:.42}
.fade{position:absolute;inset:0;background:${catalog ? `linear-gradient(to bottom,${c['background-canvas']} 0%,transparent 30%,transparent 62%,${c['background-canvas']} 100%)` : `radial-gradient(120% 70% at 50% -10%, color-mix(in oklab, ${c.glow} 22%, transparent) 0%, transparent 60%)`}}
.in{position:absolute;inset:0;padding:${Math.round(86 * scale)}px;display:flex;flex-direction:column;justify-content:space-between}
.wm{height:${Math.round(45 * scale)}px;width:auto;align-self:flex-start}
.headline{font-weight:800;font-variation-settings:"wdth" 75;text-transform:uppercase;line-height:.92}
.kicker{font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:${c['text-accent']}}
.lead{font-weight:400;line-height:1.35;color:${c['text-primary']}}
.secondary{font-weight:400;line-height:1.4;color:${c['text-secondary']}}
.domain{font-weight:700;color:${c['text-accent']}}
.stack{display:flex;flex-direction:column;gap:${Math.round(32 * scale)}px}`
function body(s, i, total, card) {
  const k = card ? 0.62 : 1
  const words = Array.isArray(s.headline) ? s.headline.join(' ') : (s.headline ?? '')
  const hl = !words ? '' : `<h1 class="headline" style="font-size:${Math.round((s.headlineSize ?? SIZE.headline) * k)}px">${esc(words)}</h1>`
  const text = [
    s.kicker ? `<div class="kicker" style="font-size:${Math.round(SIZE.kicker * (card ? 0.8 : 1))}px">${esc(s.kicker)}</div>` : '',
    hl,
    s.lead ? `<p class="lead" style="font-size:${Math.round((s.leadSize ?? SIZE.lead) * k)}px">${esc(s.lead)}</p>` : '',
    s.domain ? `<div class="domain" style="font-size:${Math.round(SIZE.domain * (card ? 0.42 : 1))}px">fenaki.tv</div>` : '',
  ].join('')
  const middle = s.disc
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:24px">${disc(s.discSize ?? 640)}<div class="stack" style="gap:18px;align-self:stretch">${text}</div></div>`
    : `<div class="stack">${text}</div>`
  const foot = s.secondary
    ? `<p class="secondary" style="font-size:${SIZE.secondary}px">${esc(s.secondary)}</p>`
    : card ? '<div></div>' : `<div class="secondary" style="font-size:${SIZE.secondary}px">${i} / ${total}${i < total ? ' →' : ''}</div>`
  return `<img class="wm" src="${wm}">${middle}${foot}`
}
const html = (w, h, s, i, total, card) => `<!doctype html><html><head><style>${css(w, h, s.bg !== 'glow', card ? 0.75 : 1)}</style></head><body><div class="bg"><img src="data:image/webp;base64,${shot}"></div><div class="fade"></div><div class="in">${body(s, i, total, card)}</div></body></html>`

const browser = await chromium.launch()
const total = spec.slides?.length ?? 0
for (const [index, s] of (spec.slides ?? []).entries()) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
  await page.setContent(html(1080, 1350, s, index + 1, total, false)); await page.waitForTimeout(300)
  // Nothing may overflow the slide: the content column must fit, with the counter or footer inside.
  const overflow = await page.evaluate(() => {
    const box = document.querySelector('.in')
    const pad = parseFloat(getComputedStyle(box).paddingRight)
    const right = box.getBoundingClientRect().right - pad
    const wide = [...box.querySelectorAll('h1,p,div')].some((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > right + 1)
    const tall = box.scrollHeight > box.clientHeight + 1 ? box.scrollHeight - box.clientHeight : 0
    return tall || (wide ? 'horizontal' : 0)
  })
  if (overflow) console.warn(`slide ${index + 1}: content overflows (${overflow}${typeof overflow === 'number' ? 'px' : ''}) — shorten the text or lower headlineSize`)
  await page.screenshot({ path: `${spec.out}/carrusel-${index + 1}.png` }); await page.close()
}
if (spec.pdf && total) {
  const imgs = await Promise.all(spec.slides.map((_, i) => readFile(`${spec.out}/carrusel-${i + 1}.png`)))
  const page = await browser.newPage()
  await page.setContent(`<!doctype html><html><head><style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;page-break-after:always}</style></head><body>${imgs.map((x) => `<img src="data:image/png;base64,${x.toString('base64')}">`).join('')}</body></html>`)
  await page.pdf({ path: `${spec.out}/${spec.pdf}`, width: '1080px', height: '1350px', printBackground: true })
}
if (spec.card) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } })
  await page.setContent(html(1200, 675, { ...spec.card, domain: spec.card.domain ?? true }, 0, 0, true)); await page.waitForTimeout(300)
  await page.screenshot({ path: `${spec.out}/horizontal.png` })
}
await browser.close()
console.log(`rendered ${total} slides${spec.card ? ' and the card' : ''} into ${spec.out}`)
