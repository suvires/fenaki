import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import backdrop from '../stories/assets/backdrop.jpg'
import backdropLight from '../stories/assets/backdrop-light.jpg'
import { ShortHero } from './ShortHero.tsx'

const meta = {
  title: 'Organisms/ShortHero',
  component: ShortHero,
  args: {
    title: 'Timecode',
    seconds: 900,
    details: ['Juanjo Giménez', '2016', 'Ficción'],
    synopsis:
      'Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día; él, de noche. Un rasguño en un coche les lleva a revisar las grabaciones de seguridad, donde descubren otra forma de comunicarse.',
    ctaLabel: 'Ver ahora',
    ctaHref: '#',
    secondaryAction: (
      <Button variant="secondary" size="lg" icon="plus">
        Añadir a mi lista
      </Button>
    ),
    poster: { title: 'Timecode', director: 'Juanjo Giménez', year: 2016, tone: 'tungsteno' },
  },
} satisfies Meta<typeof ShortHero>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongTitle: Story = {
  args: {
    title: 'Aquel no era yo',
    details: ['Esteban Crespo', '2012', 'Ficción'],
    poster: { title: 'Aquel no era yo', director: 'Esteban Crespo', year: 2012, tone: 'sala' },
  },
}
export const WithoutSynopsis: Story = { args: { synopsis: undefined, secondaryAction: undefined } }

export const InMyList: Story = {
  args: {
    secondaryAction: (
      <Button variant="secondary" size="lg" icon="check" aria-pressed>
        En mi lista
      </Button>
    ),
  },
}

/** An abstract gradient made for the catalog: never a third-party film image. */
export const WithBackdrop: Story = { args: { backdrop } }

/** A light still: the editor marked dark text. */
export const WithLightBackdrop: Story = {
  args: { backdrop: backdropLight, backdropTextColor: 'dark' },
}

/** The still already carries the title: the heading stays for screen readers only. */
export const BackdropIncludesTitle: Story = { args: { backdrop, backdropHasTitle: true } }
