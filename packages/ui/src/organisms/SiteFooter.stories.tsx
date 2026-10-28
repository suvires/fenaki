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
        { label: 'Novedades', href: '#latest' },
        { label: 'Mi lista', href: '#my-list' },
      ],
      [
        { label: 'Ficción', href: '#fiction' },
        { label: 'Documental', href: '#documentary' },
        { label: 'Animación', href: '#animation' },
        { label: 'Experimental', href: '#experimental' },
      ],
      [{ label: 'Patrocinar una colección', href: '#sponsor' }],
      [
        { label: 'Pedir la retirada de un corto', href: '#takedown' },
        { label: 'Créditos', href: '#credits' },
      ],
      [
        { label: 'Mi cuenta', href: '#account' },
        { label: 'Preferencias de reproducción', href: '#player-settings' },
      ],
      [
        { label: 'Aviso legal', href: '#legal-notice' },
        { label: 'Política de privacidad', href: '#privacy' },
        { label: 'Política de cookies', href: '#cookies' },
        { label: 'Términos de uso', href: '#terms' },
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
