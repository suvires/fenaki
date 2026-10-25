import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pagination } from '../components/Pagination.tsx'

const meta = {
  title: 'Controls/Pagination',
  component: Pagination,
  args: {
    label: 'Páginas',
    status: 'Página 2 de 3',
    previous: { href: '?page=1', label: 'Anterior' },
    next: { href: '?page=3', label: 'Siguiente' },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Middle: Story = {}
export const First: Story = { args: { status: 'Página 1 de 3', previous: undefined } }
export const Last: Story = { args: { status: 'Página 3 de 3', next: undefined } }
