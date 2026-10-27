import type { Meta, StoryObj } from '@storybook/react-vite'
import { SponsorCredit } from './SponsorCredit.tsx'

const meta = {
  title: 'Molecules/SponsorCredit',
  component: SponsorCredit,
  args: { label: 'Presentada por', name: 'Festival de Cine Breve' },
  decorators: [(Story) => <div className="bg-sponsored text-on-sponsored p-6">{Story()}</div>],
} satisfies Meta<typeof SponsorCredit>

export default meta
type Story = StoryObj<typeof meta>

export const OnSponsored: Story = {}
export const Linked: Story = {
  args: { href: 'https://example.com', linkAttributes: { 'data-umami-event': 'sponsor-click' } },
}
