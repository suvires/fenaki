import type { Meta, StoryObj } from '@storybook/react-vite'
import { SiteHeader } from '../components/SiteHeader.tsx'

const meta = {
  title: 'Layout/SiteHeader',
  component: SiteHeader,
  parameters: { layout: 'fullscreen' },
  args: {
    className: 'p-6',
    home: { href: '#', label: 'Fenaki' },
    navLabel: 'Principal',
    genres: {
      label: 'Géneros',
      items: [
        { label: 'Ficción', href: '#fiction' },
        { label: 'Documental', href: '#documentary' },
        { label: 'Animación', href: '#animation' },
        { label: 'Experimental', href: '#experimental' },
      ],
    },
    links: [
      { label: 'Novedades', href: '#latest' },
      { label: 'Mi lista', href: '#my-list' },
    ],
    search: {
      action: '#search',
      name: 'q',
      label: 'Buscar cortos',
      placeholder: 'Título, director o tema',
      toggleLabel: 'Buscar',
      clearLabel: 'Borrar búsqueda',
    },
    account: {
      signIn: { label: 'Iniciar sesión', href: '#sign-in' },
      signUp: { label: 'Crear cuenta', href: '#sign-up' },
    },
    menuLabel: 'Menú',
  },
} satisfies Meta<typeof SiteHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The genres list open. */
export const GenresOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Géneros' }))
  },
}

/** The search open in the header. */
export const SearchOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Buscar' }))
  },
}

/** Text typed: the cross clears it. */
export const SearchWithText: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Buscar' }))
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Buscar cortos' }), 'vigalondo')
  },
}
export const CurrentPage: Story = {
  args: {
    links: [
      { label: 'Novedades', href: '#latest', current: true },
      { label: 'Mi lista', href: '#my-list' },
    ],
  },
}
