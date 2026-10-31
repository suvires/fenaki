import type { Meta, StoryObj } from '@storybook/react-vite'
import { OfferCard } from './OfferCard.tsx'

const meta = {
  title: 'Molecules/OfferCard',
  component: OfferCard,
  args: {
    id: 'sala',
    audience: 'Para festivales y escuelas de cine',
    title: 'Sala propia',
    description: 'Una página propia y permanente con tu selección de cortos y tu identidad.',
    includesLabel: 'Incluye',
    includes: ['Página permanente', 'Difusión en redes y en la newsletter', 'Informe de cifras'],
    price: '700 € + IVA',
  },
  decorators: [(Story) => <div className="max-w-(--container-narrow)">{Story()}</div>],
} satisfies Meta<typeof OfferCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithAction: Story = {
  args: { action: { href: '#', label: 'Salas para festivales y escuelas' } },
}
/** A limited offer: the list price struck through, and a note on who gets it. */
export const Discounted: Story = {
  args: { listPrice: '700 € + IVA', price: '560 € + IVA', priceNote: 'Hasta el 31 de diciembre' },
}
