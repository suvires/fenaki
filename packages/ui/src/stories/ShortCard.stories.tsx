import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from './assets/backdrop.jpg'
import { ShortCard } from '../components/ShortCard.tsx'
import { SHORTS } from './fixtures.ts'

const meta = {
  title: 'Media/ShortCard',
  component: ShortCard,
  args: { ...SHORTS[0], title: 'Timecode', href: '#' },
} satisfies Meta<typeof ShortCard>

export default meta
type Story = StoryObj<typeof meta>

/** The typographic poster carries the title. The preview on hover is the page's island: see ShortPreview. */
export const WithBadge: Story = {}
/** At rest with the short's still: only the title, on a dark gradient. */
export const WithImage: Story = { args: { image: backdrop } }
/** Branded content stays visible at rest. */
export const BrandedWithImage: Story = {
  args: {
    ...SHORTS[0],
    image: backdrop,
    badges: [
      { label: 'Contenido de marca', tone: 'branded' },
      { label: 'Sub ES', tone: 'info' },
    ],
  },
}
export const WithoutBadges: Story = { args: { ...SHORTS[2], title: 'Madre', href: '#' } }
export const LongDirector: Story = { args: { ...SHORTS[3], title: 'Alike', href: '#' } }
export const Accent: Story = { args: { ...SHORTS[5], title: 'Aquel no era yo', href: '#' } }
export const Branded: Story = {
  args: {
    title: 'Servicio técnico',
    director: 'Javier Fesser',
    year: 2016,
    seconds: 738,
    tone: 'sala',
    href: '#',
    badges: [{ label: 'Contenido de marca', tone: 'branded' }],
  },
}
export const NotALink: Story = { args: { href: undefined } }
export const Stretched: Story = {
  args: { stretch: true },
  decorators: [(Story) => <div className="w-(--container-note)">{Story()}</div>],
}
