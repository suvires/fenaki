import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { RatingButtons, type Rating } from './RatingButtons.tsx'

const meta = {
  title: 'Actions/RatingButtons',
  component: RatingButtons,
  args: {
    labels: {
      rate: 'Valorar',
      dislike: 'No es para mí',
      like: 'Me gusta',
      love: '¡Me encanta!',
    },
  },
  // Room above for the tooltip and on both sides for the pill, which opens over its neighbours.
  decorators: [(Story) => <div className="inline-block bg-sala-1 px-12 pb-8 pt-12">{Story()}</div>],
} satisfies Meta<typeof RatingButtons>

export default meta
type Story = StoryObj<typeof meta>

export const Unrated: Story = {}
export const Liked: Story = { args: { value: 'like' } }
export const Loved: Story = { args: { value: 'love' } }
export const Disliked: Story = { args: { value: 'dislike' } }
/** The pill with the three options, and the tooltip of the one the pointer is on. */
export const Expanded: Story = { args: { expanded: true, tooltip: 'like' } }
export const ExpandedLoved: Story = { args: { expanded: true, value: 'love', tooltip: 'love' } }
export const ExpandedDisliked: Story = {
  args: { expanded: true, value: 'dislike', tooltip: 'dislike' },
}
/** Hover or tab into it: the choice is kept, and choosing it again clears it. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState<Rating | undefined>(undefined)
    return <RatingButtons {...args} value={value} onChange={setValue} />
  },
}
