import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

interface IndexEntry {
  id: string
  title: string
  name: string
  type: 'story' | 'docs'
}

const index = JSON.parse(
  readFileSync(new URL('../storybook-static/index.json', import.meta.url), 'utf8'),
) as { entries: Record<string, IndexEntry> }

const stories = Object.values(index.entries).filter((entry) => entry.type === 'story')

for (const story of stories) {
  test(`${story.title} / ${story.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?viewMode=story&id=${story.id}`)
    await page.locator('#storybook-root > *').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    // Stills are decoded before the shot, or a big JPEG can be caught half painted.
    await page.evaluate(() =>
      Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
    )
    await expect(page).toHaveScreenshot(`${story.id}.png`, { fullPage: true })
  })
}
