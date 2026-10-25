import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from './assets/backdrop.jpg'
import { ShortHero } from '../components/ShortHero.tsx'

const meta = {
  title: 'Media/ShortHero',
  component: ShortHero,
  args: {
    title: 'Timecode',
    seconds: 900,
    details: ['Juanjo Giménez', '2016', 'Ficción'],
    synopsis:
      'Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día; él, de noche. Un rasguño en un coche les lleva a revisar las grabaciones de seguridad, donde descubren otra forma de comunicarse.',
    ctaLabel: 'Ver ahora',
    ctaHref: '#',
    secondaryLabel: 'Añadir a mi lista',
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
export const WithoutSynopsis: Story = { args: { synopsis: undefined, secondaryLabel: undefined } }

/** An abstract gradient made for the catalog: never a third-party film image. */
export const WithBackdrop: Story = { args: { backdrop } }
