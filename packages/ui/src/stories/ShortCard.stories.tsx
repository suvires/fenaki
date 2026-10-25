import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortCard } from '../components/ShortCard.tsx'
import { SHORTS } from './fixtures.ts'

const meta = {
  title: 'Media/ShortCard',
  component: ShortCard,
  args: { ...SHORTS[0], title: 'Timecode', href: '#' },
} satisfies Meta<typeof ShortCard>

export default meta
type Story = StoryObj<typeof meta>

export const WithBadge: Story = {}
export const WithoutBadges: Story = { args: { ...SHORTS[2], title: 'Madre', href: '#' } }
export const LongDirector: Story = { args: { ...SHORTS[3], title: 'Alike', href: '#' } }
export const Accent: Story = { args: { ...SHORTS[5], title: 'Aquel no era yo', href: '#' } }
export const NotALink: Story = { args: { href: undefined } }
export const Stretched: Story = {
  args: { stretch: true },
  decorators: [(Story) => <div className="w-(--container-note)">{Story()}</div>],
}
