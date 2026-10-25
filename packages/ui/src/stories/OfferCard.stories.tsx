import type { Meta, StoryObj } from '@storybook/react-vite'
import { OfferCard } from '../components/OfferCard.tsx'

const meta = {
  title: 'Content/OfferCard',
  component: OfferCard,
  args: {
    id: 'escaparate',
    audience: 'Para festivales y escuelas de cine',
    title: 'Escaparate',
    description: 'Una página propia y permanente con tu selección de cortos y tu identidad.',
    includesLabel: 'Incluye',
    includes: [
      'Página permanente',
      'Difusión en el lanzamiento y en la newsletter',
      'Informe de cifras',
    ],
    listPrice: '700 € + IVA',
    price: '350 € + IVA',
    priceNote: 'Precio de fundador · tres primeras organizaciones',
  },
  decorators: [(Story) => <div className="max-w-(--container-note)">{Story()}</div>],
} satisfies Meta<typeof OfferCard>

export default meta
type Story = StoryObj<typeof meta>

export const Founder: Story = {}
export const WithAction: Story = {
  args: { action: { href: '#', label: 'Escaparates para festivales y escuelas' } },
}
export const ListPriceOnly: Story = {
  args: { listPrice: undefined, price: '700 € + IVA', priceNote: undefined },
}
