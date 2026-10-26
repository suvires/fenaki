import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from './assets/backdrop.jpg'
import backdropLight from './assets/backdrop-light.jpg'
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
/** At rest with the short's still: only the title, in light text over a dark image. */
export const WithImage: Story = { args: { image: backdrop } }
/** A light still: the editor marked dark text. */
export const WithLightImage: Story = { args: { image: backdropLight, imageTextColor: 'dark' } }
/** The still already carries the title (a poster): nothing is painted over it. */
export const ImageIncludesTitle: Story = { args: { image: backdrop, imageHasTitle: true } }
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

/** A viewing in progress («Seguir viendo», the history): a thin bar at the foot of the image. */
export const InProgress: Story = {
  args: { image: backdrop, progress: 0.4, progressLabel: 'Visto al 40 %' },
}
export const InProgressPoster: Story = { args: { progress: 0.75, progressLabel: 'Visto al 75 %' } }
export const Finished: Story = {
  args: { image: backdrop, progress: 1, progressLabel: 'Visto al 100 %' },
}
