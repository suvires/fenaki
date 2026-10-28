import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActiveFilters } from './ActiveFilters.tsx'

const meta = {
  title: 'Molecules/ActiveFilters',
  component: ActiveFilters,
  args: {
    label: 'Filtros activos',
    clear: { label: 'Quitar filtros', href: '?' },
    filters: [
      { label: 'Comedia', href: '?genre=horror', removeLabel: 'Quitar Comedia' },
      { label: 'Terror', href: '?genre=comedy', removeLabel: 'Quitar Terror' },
      { label: 'España', href: '?genre=comedy,horror', removeLabel: 'Quitar España' },
    ],
  },
} satisfies Meta<typeof ActiveFilters>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
