import type { Meta, StoryObj } from '@storybook/react-vite'
import { SiteFooter } from './SiteFooter.tsx'

const meta = {
  title: 'Organisms/SiteFooter',
  component: SiteFooter,
  args: {
    label: 'Pie de página',
    groups: [
      [
        { label: 'Todos los cortos', href: '#browse' },
        { label: 'Proponer un corto', href: '#propose' },
      ],
      [
        { label: 'Pedir la retirada de un corto', href: '#takedown' },
        { label: 'Patrocinar una colección', href: '#sponsor' },
        { label: 'Escaparates para festivales y escuelas', href: '#showcase' },
      ],
      [
        { label: 'Aviso legal', href: '#legal-notice' },
        { label: 'Política de privacidad', href: '#privacy' },
        { label: 'Política de cookies', href: '#cookies' },
        { label: 'Términos de uso', href: '#terms' },
        { label: 'Preferencias de reproducción', href: '#player-settings' },
        { label: 'Créditos', href: '#credits' },
      ],
    ],
    brand: 'FENAKI',
  },
} satisfies Meta<typeof SiteFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Before launch: the legal pages only, in one column. */
export const Landing: Story = {
  args: {
    groups: [
      [
        { label: 'Aviso legal', href: '#legal-notice' },
        { label: 'Política de privacidad', href: '#privacy' },
        { label: 'Política de cookies', href: '#cookies' },
      ],
    ],
  },
}
