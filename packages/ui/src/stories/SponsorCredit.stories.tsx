import type { Meta, StoryObj } from '@storybook/react-vite'
import { SponsorCredit } from '../components/SponsorCredit.tsx'

const meta = {
  title: 'Sponsorship/SponsorCredit',
  component: SponsorCredit,
  args: { label: 'Presentada por', name: 'Festival de Cine Breve' },
  decorators: [(Story) => <div className="bg-telon text-on-telon p-6">{Story()}</div>],
} satisfies Meta<typeof SponsorCredit>

export default meta
type Story = StoryObj<typeof meta>

export const OnTelon: Story = {}
export const Linked: Story = {
  args: { href: 'https://example.com', linkAttributes: { 'data-umami-event': 'sponsor-click' } },
}
