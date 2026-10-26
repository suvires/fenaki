// Renders the home page's Open Graph backdrop: the catalog screenshot tilted in perspective, as the
// landing page shows it. Satori draws no 3D transforms, so the browser bakes it once into
// src/assets/og-home-backdrop.png (transparent around it); lib/og.ts dims it and adds the text.
// Run again after replacing src/assets/landing-catalog.webp:
//   node apps/web/scripts/og-backdrop.mjs
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const asset = (name) => fileURLToPath(new URL(`../src/assets/${name}`, import.meta.url))
const shot = (await readFile(asset('landing-catalog.webp'))).toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(`<!doctype html>
<body style="margin:0;width:1200px;height:630px;overflow:hidden;perspective:1600px">
  <img src="data:image/webp;base64,${shot}"
    style="position:absolute;left:50%;top:50%;width:1400px;transform:translate(-38%,-46%) rotateX(32deg) rotateZ(-8deg)">
</body>`)
const png = await page.screenshot({ omitBackground: true })
await browser.close()
// A palette PNG: it is inlined into the server bundle, and the card dims it anyway.
await sharp(png).png({ palette: true, quality: 80 }).toFile(asset('og-home-backdrop.png'))
