import type { Meta, StoryObj } from '@storybook/react-vite'
import { SubmissionItem } from './SubmissionItem.tsx'

const meta = {
  title: 'Molecules/SubmissionItem',
  component: SubmissionItem,
  args: {
    title: 'Cuerdas',
    href: '#',
    status: 'En revisión',
    statusTone: 'info',
    text: 'Lo estamos revisando. Te avisaremos por email.',
  },
  decorators: [(Story) => <div className="max-w-[640px]">{Story()}</div>],
} satisfies Meta<typeof SubmissionItem>

export default meta
type Story = StoryObj<typeof meta>

export const InReview: Story = {}
export const Rejected: Story = {
  args: {
    status: 'No publicado',
    statusTone: 'neutral',
    text: 'Motivo: el canal no es el oficial de la productora.',
  },
}
