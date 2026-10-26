import type { Meta, StoryObj } from '@storybook/react-vite'
import { SiteFooter } from '../components/SiteFooter.tsx'

const meta = {
  title: 'Layout/SiteFooter',
  component: SiteFooter,
  args: {
    label: 'Pie de página',
    links: [
      { label: 'Todos los cortos', href: '#browse' },
      { label: 'Pedir la retirada de un corto', href: '#takedown' },
      { label: 'Aviso legal', href: '#legal-notice' },
      { label: 'Política de privacidad', href: '#privacy' },
      { label: 'Política de cookies', href: '#cookies' },
      { label: 'Créditos', href: '#credits' },
    ],
    tagline: 'El mejor cine, en cortos',
    brand: 'FENAKI',
  },
} satisfies Meta<typeof SiteFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
