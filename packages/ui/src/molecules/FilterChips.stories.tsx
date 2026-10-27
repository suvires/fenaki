import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FilterChips } from './FilterChips.tsx'

const OPTIONS = [
  { value: 'short', label: 'Menos de 5 min' },
  { value: 'mid', label: 'De 5 a 15 min' },
  { value: 'long', label: 'Más de 15 min' },
  { value: 'subtitles', label: 'Con subtítulos en español' },
]

const meta = {
  title: 'Molecules/FilterChips',
  component: FilterChips,
  args: { label: 'Duración', options: OPTIONS },
} satisfies Meta<typeof FilterChips>

export default meta
type Story = StoryObj<typeof meta>

export const Uncontrolled: Story = {}
export const WithDefault: Story = { args: { defaultValue: 'mid' } }
export const Controlled: Story = {
  render: function Controlled(args) {
    const [value, setValue] = useState<string | null>('short')
    return (
      <div className="grid gap-3">
        <FilterChips {...args} value={value} onChange={setValue} />
        <output className="font-mono text-timecode text-ink-muted">{value ?? '—'}</output>
      </div>
    )
  },
}
