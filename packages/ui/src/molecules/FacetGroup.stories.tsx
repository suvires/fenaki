import type { Meta, StoryObj } from '@storybook/react-vite'
import { FacetGroup } from './FacetGroup.tsx'

const meta = {
  title: 'Molecules/FacetGroup',
  component: FacetGroup,
  args: {
    label: 'Duración',
    countLabel: (count: number) => `${count} cortos`,
    options: [
      { label: 'Menos de 5 min', href: '?duration=short', count: 17 },
      { label: 'De 5 a 15 min', href: '?duration=mid', count: 32 },
      { label: 'Más de 15 min', href: '?duration=long', count: 24 },
    ],
  },
} satisfies Meta<typeof FacetGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = {
  args: {
    options: [
      { label: 'Menos de 5 min', href: '?duration=short', count: 17 },
      { label: 'De 5 a 15 min', href: '?', count: 32, selected: true },
      { label: 'Más de 15 min', href: '?duration=long', count: 24 },
    ],
  },
}
export const HidesEmptyOptions: Story = {
  args: {
    label: 'País',
    options: [
      { label: 'España', href: '?country=ES', count: 42 },
      { label: 'México', href: '?country=MX', count: 10 },
      { label: 'Cuba', href: '?country=CU', count: 0 },
    ],
  },
}
