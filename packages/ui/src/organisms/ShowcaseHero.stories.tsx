import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShowcaseHero } from './ShowcaseHero.tsx'

/** A plain typographic logo: no real organization's mark. */
const LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160"><rect width="480" height="160" fill="#f4efe6"/><text x="240" y="96" font-family="sans-serif" font-size="40" font-weight="700" text-anchor="middle" fill="#1a1714">ESCUELA · EJEMPLO</text></svg>',
)}`

const meta = {
  title: 'Organisms/ShowcaseHero',
  component: ShowcaseHero,
  args: {
    eyebrow: 'Sala · Escuela de cine',
    title: 'Escuela de Cine de Ejemplo',
    description:
      'Una escuela de cine ficticia para probar las salas: su selección de cortos de alumnos y antiguos alumnos.',
    logo: { src: LOGO, alt: 'Escuela de Cine de Ejemplo', width: 480, height: 160 },
    website: { href: '#', label: 'Visitar su web' },
  },
} satisfies Meta<typeof ShowcaseHero>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const PresentedBy: Story = {
  args: { sponsor: { label: 'Presentado por', name: 'Festival de Cine Breve', href: '#' } },
}
export const WithoutLogo: Story = { args: { logo: undefined, website: undefined } }
