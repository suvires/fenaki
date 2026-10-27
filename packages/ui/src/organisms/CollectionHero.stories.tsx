import type { Meta, StoryObj } from '@storybook/react-vite'
import { CollectionHero } from './CollectionHero.tsx'
import { SHORTS } from '../stories/fixtures.ts'

const posters = SHORTS.slice(0, 3).map(({ title, director, year, tone }) => ({
  title,
  director,
  year,
  tone,
}))

const meta = {
  title: 'Sponsorship/CollectionHero',
  component: CollectionHero,
  args: {
    eyebrow: 'Colección · 6 cortos',
    title: 'Imprescindibles del corto español',
    description: 'Seis cortos que marcaron una época, en los canales de sus autores.',
    ctaLabel: 'Ver la colección',
    ctaHref: '#',
    secondaryLabel: 'Añadir a mi lista',
    posters,
  },
} satisfies Meta<typeof CollectionHero>

export default meta
type Story = StoryObj<typeof meta>

export const Editorial: Story = {}
export const Sponsored: Story = {
  args: {
    sponsor: { label: 'Presentada por', name: 'Festival de Cine Breve' },
    posters: posters.map((p) => ({ ...p, tone: 'telon' as const })),
  },
}
export const WithoutSecondaryAction: Story = { args: { secondaryLabel: undefined } }
export const WithoutEyebrow: Story = { args: { eyebrow: undefined } }
