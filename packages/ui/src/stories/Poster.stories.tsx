import type { Meta, StoryObj } from '@storybook/react-vite'
import { Poster } from '../components/Poster.tsx'

const meta = {
  title: 'Media/Poster',
  component: Poster,
  args: { title: 'Cuerdas', director: 'Pedro Solís García', year: 2013, tone: 'sala' },
  decorators: [(Story) => <div className="w-(--size-card)">{Story()}</div>],
} satisfies Meta<typeof Poster>

export default meta
type Story = StoryObj<typeof meta>

export const Sala: Story = {}
export const Tungsteno: Story = {
  args: { tone: 'tungsteno', title: 'Timecode', director: 'Juanjo Giménez', year: 2016 },
}
export const Plata: Story = {
  args: { tone: 'plata', title: 'Madre', director: 'Rodrigo Sorogoyen', year: 2017 },
}
export const Telon: Story = {
  args: { tone: 'telon', title: 'Aquel no era yo', director: 'Esteban Crespo', year: 2012 },
}
export const TitleOnly: Story = { args: { director: undefined, year: undefined } }
export const AllTones: Story = {
  decorators: [(Story) => <div>{Story()}</div>],
  render: () => (
    <div className="flex gap-4 *:w-(--size-card)">
      <Poster title="Cuerdas" director="Pedro Solís García" year={2013} />
      <Poster title="Timecode" director="Juanjo Giménez" year={2016} tone="tungsteno" />
      <Poster title="Madre" director="Rodrigo Sorogoyen" year={2017} tone="plata" />
      <Poster title="Aquel no era yo" director="Esteban Crespo" year={2012} tone="telon" />
    </div>
  ),
}
