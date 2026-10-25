import type { Meta, StoryObj } from '@storybook/react-vite'
import { SiteFooter } from '../components/SiteFooter.tsx'

const meta = {
  title: 'Layout/SiteFooter',
  component: SiteFooter,
  args: {
    label: 'Pie de página',
    groups: [
      {
        title: 'Fenaki',
        links: [
          { label: 'Qué es Fenaki', href: '#what' },
          { label: 'Cómo es legal', href: '#legal' },
          { label: 'Preguntas frecuentes', href: '#faq' },
        ],
      },
      {
        title: 'Para cineastas',
        links: [{ label: 'Pedir la retirada de un corto', href: '#takedown' }],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Aviso legal', href: '#legal-notice' },
          { label: 'Privacidad', href: '#privacy' },
          { label: 'Cookies', href: '#cookies' },
        ],
      },
    ],
    tagline: 'El mejor cine, en cortos.',
    brand: 'Fenaki',
  },
} satisfies Meta<typeof SiteFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
