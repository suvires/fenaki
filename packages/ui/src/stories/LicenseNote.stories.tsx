import type { Meta, StoryObj } from '@storybook/react-vite'
import { LicenseNote } from '../components/LicenseNote.tsx'

const meta = {
  title: 'Legal/LicenseNote',
  component: LicenseNote,
  args: {
    route: 'embed',
    routeLabel: 'Embed oficial',
    children:
      'Se reproduce desde el canal de YouTube de su productora. Fenaki no aloja ni modifica el corto.',
  },
} satisfies Meta<typeof LicenseNote>

export default meta
type Story = StoryObj<typeof meta>

export const Embed: Story = {}
export const Open: Story = {
  args: {
    route: 'open',
    routeLabel: 'CC BY 4.0',
    children: '«Cuerdas», de Pedro Solís García, con licencia CC BY 4.0.',
  },
}
export const Direct: Story = {
  args: {
    route: 'direct',
    routeLabel: 'Licencia directa',
    children: 'Se publica en Fenaki con permiso directo de sus autores.',
  },
}
