import type { Meta, StoryObj } from '@storybook/react-vite'
import { TopicCard } from './TopicCard.tsx'

const meta = {
  title: 'Molecules/TopicCard',
  component: TopicCard,
  args: { title: 'Memoria e historia', href: '#', meta: '312 cortos' },
} satisfies Meta<typeof TopicCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongTitle: Story = { args: { title: 'Naturaleza y medio ambiente' } }
export const Stretched: Story = {
  args: { stretch: true },
  decorators: [(Story) => <div className="grid grid-cols-3 gap-4">{Story()}</div>],
}
