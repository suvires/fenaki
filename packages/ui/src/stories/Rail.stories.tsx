import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from './assets/backdrop.jpg'
import { Rail } from '../components/Rail.tsx'
import { ShortCard } from '../components/ShortCard.tsx'
import { SHORTS } from './fixtures.ts'

const meta = {
  title: 'Layout/Rail',
  component: Rail,
  args: {
    title: 'Novedades',
    actionLabel: 'Ver todo',
    actionHref: '#',
    children: SHORTS.map((s) => <ShortCard key={s.title} {...s} href="#" />),
  },
} satisfies Meta<typeof Rail>

export default meta
type Story = StoryObj<typeof meta>

export const WithAction: Story = {}
export const WithoutAction: Story = {
  args: { title: 'Animación en menos de 10 minutos', actionLabel: undefined },
}

export const WithImages: Story = {
  args: {
    children: SHORTS.map((s, i) => (
      <ShortCard key={s.title} {...s} image={i % 2 === 0 ? backdrop : undefined} href="#" />
    )),
  },
}

/** The first card expanded: it must not be clipped by the rail's scroll area. */
export const FirstCardExpanded: Story = {
  args: {
    children: SHORTS.map((s, i) => (
      <ShortCard key={s.title} {...s} image={backdrop} expanded={i === 0} href="#" />
    )),
  },
}
