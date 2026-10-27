import type { Meta, StoryObj } from '@storybook/react-vite'
import { Duration } from './Duration.tsx'

const meta = {
  title: 'Atoms/Duration',
  component: Duration,
  args: { seconds: 900, locale: 'es' },
} satisfies Meta<typeof Duration>

export default meta
type Story = StoryObj<typeof meta>

export const FifteenMinutes: Story = {}
export const UnderAMinute: Story = { args: { seconds: 40 } }
export const Long: Story = { args: { seconds: 1440 } }
