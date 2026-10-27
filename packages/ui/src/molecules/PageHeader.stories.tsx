import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHeader } from './PageHeader.tsx'

const meta = {
  title: 'Molecules/PageHeader',
  component: PageHeader,
  args: {
    eyebrow: 'Catálogo · 73 cortos',
    title: 'Todos los cortos',
    description: 'Filtra por duración, idioma, subtítulos, forma, tipo o país.',
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Person: Story = {
  args: {
    eyebrow: 'Dirección · Guion',
    title: 'Nacho Vigalondo',
    description: undefined,
  },
}
export const TitleOnly: Story = { args: { eyebrow: undefined, description: undefined } }
