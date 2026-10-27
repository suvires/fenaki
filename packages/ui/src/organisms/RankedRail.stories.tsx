import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from '../stories/assets/backdrop.jpg'
import { RankedItem, RankedRail } from './RankedRail.tsx'
import { RankNumber } from '../atoms/RankNumber.tsx'
import { ShortCard } from '../molecules/ShortCard.tsx'
import { SHORTS } from '../stories/fixtures.ts'

/** Ten distinct shorts: the six samples, then four more with their own titles. */
const TEN = [...SHORTS, ...SHORTS]
  .slice(0, 10)
  .map((s, i) => (i < SHORTS.length ? s : { ...s, title: `${s.title} (${i + 1})` }))

const items = (withImages: boolean) =>
  TEN.map((s, i) => (
    <RankedItem key={s.title} rank={i + 1} rankLabel={`Puesto ${i + 1}`}>
      <ShortCard {...s} image={withImages ? backdrop : undefined} href="#" />
    </RankedItem>
  ))

const meta = {
  title: 'Layout/RankedRail',
  component: RankedRail,
  args: { title: 'Lo más visto', children: items(true) },
} satisfies Meta<typeof RankedRail>

export default meta
type Story = StoryObj<typeof meta>

export const WithImages: Story = {}
export const WithoutImages: Story = { args: { children: items(false) } }

/** The figure on its own: one digit and the tighter two-digit 10. */
export const Numbers: StoryObj = {
  render: () => (
    <div className="flex gap-8">
      {[1, 4, 7, 10].map((rank) => (
        <RankNumber key={rank} rank={rank} />
      ))}
    </div>
  ),
}
