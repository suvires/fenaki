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

/** A plain typographic logo, drawn here: no real organization's mark. */
const logo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64"><text x="120" y="42" font-family="sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#1a1714">CINE BREVE</text></svg>',
)}`
export const WithLogo: Story = { args: { href: 'https://example.com', logo: { src: logo } } }
