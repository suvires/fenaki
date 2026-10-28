import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pagination } from './Pagination.tsx'

const meta = {
  title: 'Molecules/Pagination',
  component: Pagination,
  args: {
    label: 'Páginas',
    page: 4,
    pages: 9,
    href: (page: number) => `?page=${page}`,
    previousLabel: 'Anterior',
    nextLabel: 'Siguiente',
    pageLabel: (page: number) => `Página ${page}`,
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Middle: Story = {}
export const First: Story = { args: { page: 1 } }
export const Last: Story = { args: { page: 9 } }
export const FewPages: Story = { args: { page: 2, pages: 3 } }
