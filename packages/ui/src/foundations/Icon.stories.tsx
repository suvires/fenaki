import type { Meta, StoryObj } from '@storybook/react-vite'
import { Icon, ICON_NAMES } from './Icon.tsx'

const meta = {
  title: 'Foundations/Iconography',
  component: Icon,
  args: { name: 'play' },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const AllSizes: Story = {
  render: () => (
    <div className="grid gap-4 text-primary">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <span className="w-8 font-mono text-label-s text-secondary">{size}</span>
          {ICON_NAMES.map((name) => (
            <Icon key={name} name={name} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
}

/** The 24px grid: live area (2–22), the 16px square most shapes fill, and the circle keyline. */
function Keylines() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="absolute inset-0 size-full text-(color:--border-color-strong)"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.06}
    >
      {Array.from({ length: 25 }, (_, i) => (
        <g key={i}>
          <path d={`M${i} 0v24`} />
          <path d={`M0 ${i}h24`} />
        </g>
      ))}
      <g className="text-accent" strokeWidth={0.12}>
        <rect x={2} y={2} width={20} height={20} />
        <rect x={4} y={4} width={16} height={16} />
        <circle cx={12} cy={12} r={8} />
      </g>
    </svg>
  )
}

export const Grid: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 text-primary">
      {ICON_NAMES.map((name) => (
        <div key={name} className="grid gap-2 justify-items-center">
          <div className="relative size-(--size-column)">
            <Keylines />
            <Icon name={name} className="relative size-full" />
          </div>
          <span className="font-mono text-label-s text-secondary">{name}</span>
        </div>
      ))}
    </div>
  ),
}
