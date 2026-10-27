import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchField } from './SearchField.tsx'

const meta = {
  title: 'Navigation/SearchField',
  component: SearchField,
  args: { label: 'Buscar cortos', placeholder: 'Título, director o tema' },
} satisfies Meta<typeof SearchField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const WithQuery: Story = { args: { defaultValue: 'Vigalondo' } }
